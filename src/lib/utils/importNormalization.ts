import type { Bundle, Coding, Identifier, Patient, Resource } from "fhir/r4";
import { type ResourceRetrieveEvent } from "$lib/utils/types";
import {
  SOURCE_NAMESPACE,
  PLACEHOLDER_SYSTEM,
  CATEGORY_SYSTEM,
  METHOD_SYSTEM,
  SOURCE_NAME_SYSTEM
} from "$lib/config/config";
import { ResourceHelper } from "$lib/utils/ResourceHelper";
import { assignPatientReference, constructPatientResource, PATIENT_REFERENCE_FIELDS } from "$lib/utils/util";

class ReferenceMap {
  #map = new Map<string, string>(); // key: JSON.stringify([resourceType, id]) or raw fullUrl string -> new fullUrl

  register(resourceType: string, id: string, newFullUrl: string) {
    this.#map.set(this.#key(resourceType, id), newFullUrl);
  }

  registerFullUrl(originalFullUrl: string, newFullUrl: string) {
    this.#map.set(originalFullUrl, newFullUrl);
  }

  resolve(refString: string) {
    if (this.#map.has(refString)) {
      return this.#map.get(refString); // fullUrl case
    }

    const typeId = extractTypeId(refString);
    if (typeId) {
      const key = this.#key(...typeId);
      if (this.#map.has(key)) {
        return this.#map.get(key);
      }
    }
    return undefined;
  }

  resolveTypeId(resourceType: string, id: string) {
    const key = this.#key(resourceType, id);
    return this.resolve(key);
  }

  #key(resourceType: string, id: string) {
    return `${resourceType}/${id}`;
  }
}

export interface BundleEntry {
  resource: Resource;
  fullUrl?: string;
}

export interface NormalizedIdEntry extends BundleEntry {
  resource: NormalizedResource;
}

export interface NormalizedBundleEntry extends NormalizedIdEntry {
  fullUrl: string;
}

export interface NormalizedResource extends Resource {
  resourceType: string;
  id: string;
}

export interface NormalizedBundle extends Bundle {
  resourceType: "Bundle";
  type: "collection";
  entry: NormalizedBundleEntry[];
}

function extractTypeId(refString: string): [string, string] | undefined {
  const parts = refString.split("/");
  if (parts.length < 2) return undefined;
  const id = parts.pop();
  const resourceType = parts.pop();
  if (!id || !resourceType) return undefined;
  return [resourceType, id];
}

function generateFullUrl() {
  return `urn:uuid:${crypto.randomUUID()}`;
}

function registerEntry(entry: BundleEntry, referenceMap: ReferenceMap): string {
  const newFullUrl = generateFullUrl();
  referenceMap.register(entry.resource.resourceType, entry.resource.id, newFullUrl);
  if (entry.fullUrl) {
    referenceMap.registerFullUrl(entry.fullUrl, newFullUrl);
  }
  return newFullUrl;
}

function buildReferenceMap(entries: NormalizedIdEntry[]): ReferenceMap {
  const referenceMap = new ReferenceMap();
  for (const entry of entries) {
    if (!entry.resource.id) {
      throw new Error(
        `buildReferenceMap: resource of type ${entry.resource.resourceType} is missing an id. ` +
        `Call ensureResourceIds(data) before buildReferenceMap(data).`
      );
    }
    registerEntry(entry, referenceMap);
  }
  return referenceMap;
}

function isBundleEntryArray(data: BundleEntry[] | Resource[]): data is BundleEntry[] {
  return data.length === 0 || data.some(entry => "resource" in entry);
}

function isResourceArray(data: BundleEntry[] | Resource[]): data is Resource[] {
  return data.length === 0 || data.some(entry => "resourceType" in entry);
}

export function getEntries(data: BundleEntry[] | Resource[]): BundleEntry[] {
  if (isBundleEntryArray(data)) {
    return data
    .filter(d => d.resource)
    .map(d => {return { resource: d.resource, fullUrl: d.fullUrl }});
  }
  if (isResourceArray(data)) {
    return data.map(resource => ({ resource }));
  }

  throw new Error(
    `getEntries: invalid data format: input must be BundleEntry[] or Resource[]. ` +
    `First element keys: ${Object.keys(data[0] ?? {})}`
  );
}

export function sourceIdSystem(source: string, resourceType: string) {
  return `${SOURCE_NAMESPACE}:${source}/${resourceType}`;
}

const toArray = <T>(value: T | T[] | undefined): T[] => value === undefined ? [] : Array.isArray(value) ? value : [value];

function sourceIdentifierValue(resource: Resource, source: string): string | undefined {
  const system = sourceIdSystem(source, resource.resourceType);
  return toArray((resource as any).identifier as Identifier | Identifier[] | undefined)
    .find(identifier => identifier.system === system)?.value;
}

/**
 * Gives resources extracted from a QuestionnaireResponse a deterministic source identifier, so
 * the same extraction from a later import of the same source matches (instead of looking like a
 * new resource replacing a removed one). The value is derived from the QuestionnaireResponse's
 * own source id and the resource's type and position among that type's extracted resources, so
 * it is only as stable as the QuestionnaireResponse's id.
 */
export function stampExtractedResources(source: string, questionnaireResponse: Resource, extracted: Resource[]): Resource[] {
  const qrKey = sourceIdentifierValue(questionnaireResponse, source) ?? questionnaireResponse.id;
  const countByType = new Map<string, number>();
  for (const resource of extracted) {
    const system = sourceIdSystem(source, resource.resourceType);
    const index = countByType.get(resource.resourceType) ?? 0;
    countByType.set(resource.resourceType, index + 1);
    const identifiers = toArray((resource as any).identifier as Identifier | Identifier[] | undefined);
    if (!identifiers.some(identifier => identifier.system === system)) {
      (resource as any).identifier = [
        ...identifiers,
        { system, value: `${qrKey}:${resource.resourceType}:${index}` }
      ];
    }
  }
  return extracted;
}

export interface DatasetDiff {
  added: Resource[]; // incoming resources with no match in the existing dataset
  updated: Array<{ incoming: Resource; existing: Resource }>; // matched to an existing resource, with different content
  unchanged: Array<{ incoming: Resource; existing: Resource }>; // matched to an existing resource, with the same content
  removed: Resource[]; // existing resources with no match in the incoming set
}

// Pairs incoming resources with the existing resources they correspond to (at most one each)
export type ResourceMatcher = (incoming: Resource[], existing: Resource[]) => Array<[Resource, Resource]>;

// Matches on the source identifier added during import normalization
export function matchBySourceIdentifier(source: string): ResourceMatcher {
  return (incoming, existing) => {
    const key = (resource: Resource) => {
      const value = sourceIdentifierValue(resource, source);
      return value === undefined ? undefined : `${resource.resourceType}|${value}`;
    };
    const existingByKey = new Map<string, Resource>();
    for (const resource of existing) {
      const k = key(resource);
      if (k !== undefined && !existingByKey.has(k)) {
        existingByKey.set(k, resource);
      }
    }
    const pairs: Array<[Resource, Resource]> = [];
    for (const resource of incoming) {
      const k = key(resource);
      const match = k === undefined ? undefined : existingByKey.get(k);
      if (match) {
        existingByKey.delete(k!); // each existing resource matches once
        pairs.push([resource, match]);
      }
    }
    return pairs;
  };
}

/**
 * Compares an import against the dataset it will replace. Matched resources are split by whether
 * their core content (see ResourceHelper.core) differs. Patient resources describe the dataset
 * itself (and a placeholder is regenerated on every import), so they are left out of the diff.
 */
export function diffDataset(incoming: Resource[], existing: Resource[], matcher: ResourceMatcher): DatasetDiff {
  const patient = (resource: Resource) => resource.resourceType === 'Patient';
  const notPatient = (resource: Resource) => resource.resourceType !== 'Patient';
  const patientResource = existing.find(patient);
  const incomingResources = incoming.filter(notPatient);
  const existingResources = existing.filter(notPatient);
  const pairs = matcher(incomingResources, existingResources);
  const matchedIncoming = new Set(pairs.map(([i]) => i));
  const matchedExisting = new Set(pairs.map(([, e]) => e));
  const matches = pairs.map(([incoming, existing]) => ({ incoming, existing }));
  return {
    added: incomingResources.filter(resource => !matchedIncoming.has(resource)),
    updated: matches.filter(({ incoming, existing }) => !ResourceHelper.hasSameCore(incoming, existing)),
    unchanged: matches.filter(({ incoming, existing }) => ResourceHelper.hasSameCore(incoming, existing)),
    removed: existingResources.filter(resource => !matchedExisting.has(resource))
  };
}

function preserveSourceIdentifiers(entries: BundleEntry[], source: string) {
  return entries.map(entry => {
    if (!entry.resource.id) {
      return entry;
    }
    const system = sourceIdSystem(source, entry.resource.resourceType);
    if (entry.resource.identifier
      && (
        entry.resource.identifier.length
        && entry.resource.identifier.find(identifier => identifier.system === system)
        || !entry.resource.identifier.length
      )
    ) {
      return entry;
    }
    entry.resource.identifier = entry.resource.identifier || [];
    entry.resource.identifier.push({
      system: system,
      value: entry.resource.id,
    });
    return entry;
  });
}

function fillMissingIds(entries: BundleEntry[]): NormalizedIdEntry[] {
  return entries.map(entry => {
    if (!entry.resource.id) {
      entry.resource.id = crypto.randomUUID();
    }
    return entry as NormalizedIdEntry;
  });
}

function generateCategoryPlaceholderPatient(masterPatient: Patient): Resource {
  let patient = constructPatientResource({
    first: masterPatient.name?.[0].given?.[0],
    last: masterPatient.name?.[0].family,
  });
  patient.id = crypto.randomUUID();
  patient.meta = patient.meta ?? {};
  patient.meta.lastUpdated = new Date().toISOString();
  patient.meta.tag = patient.meta.tag ?? [];
  patient.meta.tag.push({
    system: PLACEHOLDER_SYSTEM,
    code: 'placeholder-patient'
  });
  return patient;
}

function pushTagIfMissing(tags: Coding[], system: string, code: string) {
  if (!tags.some(t => t.system === system && t.code === code)) {
    tags.push({ system, code });
  }
}

function ensurePatientResource(
  masterPatient: Patient,
  entries: BundleEntry[],
  category: string,
  method: string,
  source: string,
  sourceName: string
): NormalizedIdEntry[] {
  let patientEntry = entries?.find((entry) => entry.resource.resourceType === "Patient");
  if (!patientEntry) {
    const patient = generateCategoryPlaceholderPatient(masterPatient);
    patientEntry = {
      resource: patient,
      fullUrl: `urn:uuid:${patient.id}` // Important for reference mapping elsewhere (ResourceCollection)
    };
    entries = [patientEntry, ...(entries ?? [])];
  }
  const patient = patientEntry.resource;
  patient.meta = patient.meta ?? {};
  patient.meta.tag = patient.meta.tag ?? [];
  pushTagIfMissing(patient.meta.tag, CATEGORY_SYSTEM, category);
  pushTagIfMissing(patient.meta.tag, METHOD_SYSTEM, method);
  if (sourceName) {
    pushTagIfMissing(patient.meta.tag, SOURCE_NAME_SYSTEM, sourceName);
  }
  patient.meta.source = source;
  return entries;
}

function assignEntryPatientReferences(entries: NormalizedBundleEntry[]): NormalizedBundleEntry[] {
  const patientEntry = entries.find((entry) => entry.resource.resourceType === "Patient");
  if (!patientEntry) throw new Error("assignEntryPatientReferences: no Patient resource found");
  const patientRef = patientEntry.fullUrl;
  for (const entry of entries) {
    assignPatientReference(entry.resource, patientRef);
  }
  return entries;
}

function assignFullUrls(entries: NormalizedIdEntry[], referenceMap: ReferenceMap): NormalizedBundleEntry[] {
  return entries.map(entry => {
    const newFullUrl =
      (entry.fullUrl && referenceMap.resolve(entry.fullUrl)) ||
      referenceMap.resolveTypeId(entry.resource.resourceType, entry.resource.id);
    if (!newFullUrl) {
      throw new Error(`assignFullUrls: no registered fullUrl for ${entry.resource.resourceType}/${entry.resource.id}`);
    }
    entry.fullUrl = newFullUrl;
    return entry as NormalizedBundleEntry;
  });
}

function findFhirReferencePaths(resource: Resource): string[] {
  const results: string[] = [];

  function traverse(obj: any, path: string) {
    if (!obj || typeof obj !== 'object') return;

    if (typeof obj.reference === 'string') {
      const finalPath = `${path}.reference`;
      results.push(finalPath);
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (Array.isArray(value)) {
        value.forEach((item, i) => traverse(item, `${nextPath}[${i}]`));
      } else {
        traverse(value, nextPath);
      }
    }
  }

  traverse(resource, '');
  return results;
}

function locateReference(obj: any, path: string): { target: any, last: string } {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  const last = parts.pop()!;
  const target = parts.reduce((o, k) => o[k], obj);
  return { target, last };
}

// Contained references ("#id") resolve within their own resource, so they are never external
function isUnresolvedReference(reference: string, referenceMap: ReferenceMap): boolean {
  return !reference.startsWith('#') && !referenceMap.resolve(reference);
}

// Patient-linked fields are overwritten with the dataset's Patient by assignEntryPatientReferences
function isPatientLinkedPath(path: string): boolean {
  return (PATIENT_REFERENCE_FIELDS as readonly string[]).includes(path.split(/[.[]/)[0]);
}

// Rewrites a reference to its new fullUrl. A reference whose target isn't part of this upload
// can't be kept, since the FHIR server rejects external references (and a urn: reference that
// doesn't resolve within the transaction rejects the whole transaction). Such a reference is
// dropped, keeping any display/identifier on the Reference. Returns the Reference object if it
// had its reference dropped, so it can be pruned if nothing else remains in it.
function convertToFullUrlReference(obj: any, path: string, referenceMap: ReferenceMap): object | undefined {
  const { target, last } = locateReference(obj, path);
  const current: string = target[last];
  const newReference = referenceMap.resolve(current);
  if (newReference) {
    target[last] = newReference;
    return;
  }
  if (!isUnresolvedReference(current, referenceMap) || isPatientLinkedPath(path)) {
    return;
  }
  console.warn(`convertToFullUrlReference: dropping unresolvable reference "${current}" at ${obj.resourceType}/${obj.id}.${path}`);
  delete target[last];
  return target;
}

// Remove Reference objects (and arrays left empty by that) that had nothing but their reference
function pruneEmptyReferences(node: any, dropped: Set<object>) {
  if (!node || typeof node !== 'object') return;
  const isEmptyDropped = (item: any) => dropped.has(item) && Object.keys(item).length === 0;
  for (const [key, value] of Object.entries(node)) {
    if (Array.isArray(value)) {
      value.forEach(item => pruneEmptyReferences(item, dropped));
      const kept = value.filter(item => !isEmptyDropped(item));
      if (kept.length === 0 && value.length > 0) {
        delete node[key];
      } else if (kept.length !== value.length) {
        node[key] = kept;
      }
    } else {
      pruneEmptyReferences(value, dropped);
      if (isEmptyDropped(value)) {
        delete node[key];
      }
    }
  }
}

function convertToFullUrlReferences(entry: NormalizedBundleEntry, referenceMap: ReferenceMap) {
  const paths = findFhirReferencePaths(entry.resource);
  const dropped = new Set<object>();
  for (const path of paths) {
    const droppedFrom = convertToFullUrlReference(entry.resource, path, referenceMap);
    if (droppedFrom) {
      dropped.add(droppedFrom);
    }
  }
  if (dropped.size) {
    pruneEmptyReferences(entry.resource, dropped);
  }
}

function rewriteAllReferences(entries: NormalizedBundleEntry[], referenceMap: ReferenceMap): NormalizedBundleEntry[] {
  for (const entry of entries) {
    convertToFullUrlReferences(entry, referenceMap);
  }
  return entries;
}

function toBundle(entries: NormalizedBundleEntry[]): NormalizedBundle {
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: entries
  } as NormalizedBundle;
}

// Convert entry array to resource array
export function entriesToResources(entries: NormalizedIdEntry[]): Resource[] {
  return entries.map(entry => (entry.resource));
}

// Map a resource array back into the entry array it came from originally
// Handles interim changes to the resource list (e.g. added/removed resources, updated resources with same type/id)
export function reconcileResourcesWithOriginalEntries(
  originalEntries: NormalizedIdEntry[],
  currentResources: Resource[]
): NormalizedIdEntry[] {
  const fullUrlByKey = new Map(originalEntries.map(e => [`${e.resource.resourceType}/${e.resource.id}`, e.fullUrl]));
  return currentResources.map(resource => ({
    resource: resource as NormalizedResource,
    fullUrl: fullUrlByKey.get(`${resource.resourceType}/${resource.id}`),
  }));
}

export function prepareImportedResources(importEvent: ResourceRetrieveEvent, masterPatient: Patient): NormalizedIdEntry[] {
  if (!importEvent.resources) {
    return [];
  }
  let entries: BundleEntry[] = getEntries(importEvent.resources);
  entries = preserveSourceIdentifiers(entries, importEvent.source);
  let idEntries: NormalizedIdEntry[] = fillMissingIds(entries);
  idEntries = ensurePatientResource(
    masterPatient,
    idEntries,
    importEvent.category,
    importEvent.method,
    importEvent.source,
    importEvent.sourceName);
  return idEntries;
}

/**
 * Drops entries that would be uploaded without anything linking them to the dataset's Patient.
 * A dataset is read back through its Patient (Patient/$everything), so a resource that neither
 * refers to the Patient nor is referred to by something that does (e.g. an Organization that was
 * only referenced by a Composition that isn't uploaded) is never retrieved again: it would just
 * be stored dangling, and look new on every import of the same data.
 */
export function pruneUnlinkedEntries<T extends BundleEntry>(entries: T[]): T[] {
  const referenceMap = new ReferenceMap();
  entries.forEach((entry, i) => {
    if (entry.resource.id) {
      referenceMap.register(entry.resource.resourceType, entry.resource.id, String(i));
    }
    if (entry.fullUrl) {
      referenceMap.registerFullUrl(entry.fullUrl, String(i));
    }
  });

  const isPatientLinked = (resource: Resource) =>
    resource.resourceType === 'Patient' || PATIENT_REFERENCE_FIELDS.some(field => field in resource);

  const linked = new Set<number>();
  const pending: number[] = [];
  entries.forEach((entry, i) => {
    if (isPatientLinked(entry.resource)) {
      linked.add(i);
      pending.push(i);
    }
  });
  // Resources referenced (directly or indirectly) by a linked resource are retrieved with it
  while (pending.length) {
    const { resource } = entries[pending.pop()!];
    for (const path of findFhirReferencePaths(resource)) {
      const { target, last } = locateReference(resource, path);
      const resolved = referenceMap.resolve(target[last]);
      if (resolved !== undefined && !linked.has(Number(resolved))) {
        linked.add(Number(resolved));
        pending.push(Number(resolved));
      }
    }
  }
  return entries.filter((_, i) => linked.has(i));
}

export function finalizeForUpload(entries: NormalizedIdEntry[]): NormalizedBundleEntry[] {
  const referenceMap: ReferenceMap = buildReferenceMap(entries);
  let fullEntries: NormalizedBundleEntry[] = assignFullUrls(entries, referenceMap);
  fullEntries = rewriteAllReferences(fullEntries, referenceMap);
  fullEntries = assignEntryPatientReferences(fullEntries);
  return fullEntries;
}
