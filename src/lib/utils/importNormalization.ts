import type { Bundle, Coding, Patient, Resource } from "fhir/r4";
import { type ResourceRetrieveEvent } from "$lib/utils/types";
import {
  SOURCE_NAMESPACE,
  PLACEHOLDER_SYSTEM,
  CATEGORY_SYSTEM,
  METHOD_SYSTEM,
  SOURCE_NAME_SYSTEM
} from "$lib/config/config";
import { assignPatientReference, constructPatientResource } from "$lib/utils/util";

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

function preserveSourceIdentifiers(entries: BundleEntry[], source: string) {
  return entries.map(entry => {
    if (!entry.resource.id) {
      return entry;
    }
    const system = sourceIdSystem(source, entry.resource.resourceType);
    if (entry.resource.identifier && entry.resource.identifier.find(identifier => identifier.system === system)) {
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

function convertToFullUrlReference(obj: any, path: string, referenceMap: ReferenceMap) {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  const last = parts.pop()!;
  const target = parts.reduce((o, k) => o[k], obj);
  const current: string = target[last];
  const newReference = referenceMap.resolve(current);
  if (newReference) {
    target[last] = newReference;
    return;
  }
  // A urn:uuid:/urn:oid: reference must resolve to a fullUrl within this same transaction bundle,
  // or the FHIR server will reject the whole transaction. Since we can't resolve it (the target
  // resource isn't part of this upload), drop the reference rather than send a broken placeholder.
  if (current.startsWith('urn:')) {
    console.warn(`convertToFullUrlReference: dropping unresolvable reference "${current}" at ${obj.resourceType}/${obj.id}.${path}`);
    delete target[last];
  }
}

function convertToFullUrlReferences(entry: NormalizedBundleEntry, referenceMap: ReferenceMap) {
  const paths = findFhirReferencePaths(entry.resource);
  for (const path of paths) {
    convertToFullUrlReference(entry.resource, path, referenceMap);
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

export function prepareImportedResources(importEvent: ResourceRetrieveEvent, masterPatient: Patient): Bundle {
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

export function finalizeForUpload(entries: NormalizedIdEntry[]): NormalizedBundleEntry[] {
  const referenceMap: ReferenceMap = buildReferenceMap(entries);
  let fullEntries: NormalizedBundleEntry[] = assignFullUrls(entries, referenceMap);
  fullEntries = rewriteAllReferences(fullEntries, referenceMap);
  fullEntries = assignEntryPatientReferences(fullEntries);
  return fullEntries;
}
