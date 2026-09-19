/**
 * Pulling AI provenance in behind an import.
 *
 * AI labelling points the wrong way for an importer: the Provenance references
 * the Observation, not the other way round, so fetching an Observation tells you
 * nothing about the AI that produced it. This module does the reverse lookup —
 * `Provenance?target=...` — and then walks the chain the IG defines from there:
 *
 *   Provenance.agent.who    -> Device (the AI system) and the people involved
 *   Provenance.entity.what  -> DocumentReference (Model-Card, input prompt)
 *   Device[modelCardDescription] -> DocumentReference (Model-Card)
 *   DocumentReference.content.attachment.url -> Binary (Model-Card body)
 *
 * It is deliberately conservative: anything that turns out not to be about AI is
 * dropped rather than added to the user's record, every request is allowed to
 * fail, and a server that does not support Provenance search costs a handful of
 * requests before the whole pass gives up.
 */

import type { Device, DocumentReference, Provenance, Reference, Resource } from 'fhir/r4';
import {
  MODEL_CARD_EXTENSION,
  isAiDevice,
  isAiProvenance,
  isAiProvenanceCandidate,
  isInputPromptDocument,
  isModelCardDocument,
  type Resolver
} from '$lib/utils/aiProvenance';

/**
 * Resolves a relative FHIR URL — a search like `Provenance?target=Observation/1`
 * or a read like `Device/2` — to a flat list of resources. Rejecting is fine and
 * expected; the caller treats a failure as "nothing found".
 */
export type FhirRequest = (relativeUrl: string) => Promise<Resource[]>;

export interface AiProvenanceFetchOptions {
  /** Targets per `Provenance?target=` search. */
  targetsPerQuery?: number;
  /** Ceiling on one-target-at-a-time queries, used only when a batch is rejected. */
  maxIndividualQueries?: number;
  /** Called with a short progress line, for import status text. */
  onStatus?: (message: string) => void;
}

/** Never worth asking a server for the provenance of. */
const NON_TARGET_TYPES = new Set(['Provenance', 'Bundle', 'Binary', 'OperationOutcome', 'Composition']);

/** Reference types worth resolving out of a Provenance. */
const RESOLVABLE_AGENT_TYPES = new Set([
  'Device',
  'Practitioner',
  'PractitionerRole',
  'RelatedPerson',
  'Organization'
]);

/** Model-Card bodies we can actually show; a PDF Binary would just be dead weight. */
const TEXTUAL_CONTENT_TYPE = /^(text\/|application\/(json|xml)|application\/[\w.+-]+\+(json|xml))/;

/**
 * Resource types we are willing to recognise inside a URL when working out where
 * a FHIR server's base ends. Matching a known name rather than "looks
 * capitalised" keeps path segments like `.../api/FHIR/R4/...` from being
 * mistaken for one.
 */
const URL_RESOURCE_TYPES = new Set([
  'AllergyIntolerance', 'Bundle', 'CarePlan', 'ClaimResponse', 'ClinicalImpression', 'Composition',
  'Condition', 'Consent', 'Coverage', 'Device', 'DeviceUseStatement', 'DiagnosticReport',
  'DocumentReference', 'Encounter', 'ExplanationOfBenefit', 'Flag', 'Goal', 'Immunization',
  'Location', 'Media', 'Medication', 'MedicationRequest', 'MedicationStatement', 'Observation',
  'Organization', 'Patient', 'Practitioner', 'PractitionerRole', 'Procedure', 'Provenance',
  'QuestionnaireResponse', 'RelatedPerson', 'Specimen'
]);

/**
 * The FHIR base URL behind a resource or operation URL, e.g.
 * `https://ex.org/api/FHIR/R4/Patient/1/$summary` -> `https://ex.org/api/FHIR/R4`.
 * Returns undefined rather than guessing when no resource type is recognisable.
 */
export function deriveFhirBaseUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  const segments = parsed.pathname.split('/').filter(Boolean);
  // Scan from the end: the type nearest the operation is the one being addressed.
  for (let i = segments.length - 1; i >= 0; i--) {
    if (!URL_RESOURCE_TYPES.has(segments[i])) continue;
    const basePath = segments.slice(0, i).join('/');
    return `${parsed.origin}${basePath ? `/${basePath}` : ''}`;
  }
  return undefined;
}

interface ParsedReference {
  key: string;
  type: string;
}

function parseReference(reference: string | undefined): ParsedReference | undefined {
  if (!reference) return undefined;
  const trimmed = reference.split('#')[0].split('?')[0].replace(/\/$/, '');
  const segments = trimmed.split('/');
  const id = segments[segments.length - 1];
  const type = segments[segments.length - 2];
  if (!id || !type || !/^[A-Z][A-Za-z]+$/.test(type)) return undefined;
  return { key: `${type}/${id}`, type };
}

function resourceKey(resource: Resource | undefined): string | undefined {
  if (!resource?.resourceType || !resource.id) return undefined;
  return `${resource.resourceType}/${resource.id}`;
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

/**
 * Find the AI-transparency resources that describe `resources`, and return the
 * ones not already held. Returns an empty array whenever nothing AI-related is
 * found, which is the overwhelmingly common case.
 */
export async function fetchAiProvenanceResources(
  resources: Resource[] | undefined,
  request: FhirRequest,
  options: AiProvenanceFetchOptions = {}
): Promise<Resource[]> {
  const { targetsPerQuery = 40, maxIndividualQueries = 25, onStatus } = options;

  const held = new Map<string, Resource>();
  const targets: string[] = [];
  for (const resource of resources ?? []) {
    const key = resourceKey(resource);
    if (!key) continue;
    if (!held.has(key)) held.set(key, resource);
    if (!NON_TARGET_TYPES.has(resource.resourceType)) targets.push(key);
  }
  if (targets.length === 0) return [];

  const candidates = await searchProvenance(targets, request, {
    targetsPerQuery,
    maxIndividualQueries
  });
  if (candidates.length === 0) return [];

  onStatus?.(`Checking ${candidates.length} provenance record${candidates.length === 1 ? '' : 's'} for AI involvement`);

  // Resolve what the candidates point at, so we can tell the AI ones apart.
  const fetched = new Map<string, Resource>();
  const lookup = (key: string): Resource | undefined => fetched.get(key) ?? held.get(key);
  const resolve: Resolver = (reference: Reference | undefined, container?: Resource) => {
    const ref = reference?.reference;
    if (!ref) return undefined;
    if (ref.startsWith('#')) {
      return (container as { contained?: Resource[] } | undefined)?.contained?.find((c) => c.id === ref.slice(1));
    }
    const parsed = parseReference(ref);
    return parsed ? lookup(parsed.key) : undefined;
  };

  const wanted = new Set<string>();
  for (const provenance of candidates) {
    for (const agent of provenance.agent ?? []) {
      queue(wanted, agent.who?.reference, RESOLVABLE_AGENT_TYPES, held, fetched);
    }
    for (const entity of provenance.entity ?? []) {
      queue(wanted, entity.what?.reference, new Set(['DocumentReference']), held, fetched);
    }
  }
  await readInto(wanted, request, fetched);

  // Model-Cards attached to an AI Device are one hop further out.
  const modelCardRefs = new Set<string>();
  for (const resource of fetched.values()) {
    if (!isAiDevice(resource)) continue;
    for (const extension of (resource as Device).extension ?? []) {
      if (extension.url !== MODEL_CARD_EXTENSION) continue;
      queue(modelCardRefs, extension.valueReference?.reference, new Set(['DocumentReference']), held, fetched);
    }
  }
  await readInto(modelCardRefs, request, fetched);

  // Now that the Devices are known, drop everything that is not about AI.
  const aiProvenances = candidates.filter((provenance) => isAiProvenance(provenance, resolve));
  if (aiProvenances.length === 0) return [];

  // Model-Card bodies held in a Binary, for the cards that survived.
  const keep = closureOf(aiProvenances, lookup);
  const binaryRefs = new Set<string>();
  for (const key of keep) {
    const resource = lookup(key);
    if (!isModelCardDocument(resource) && !isInputPromptDocument(resource)) continue;
    for (const content of (resource as DocumentReference).content ?? []) {
      const url = content.attachment?.url;
      const contentType = content.attachment?.contentType ?? '';
      if (!url || !TEXTUAL_CONTENT_TYPE.test(contentType)) continue;
      queue(binaryRefs, url, new Set(['Binary']), held, fetched);
    }
  }
  await readInto(binaryRefs, request, fetched);
  for (const key of binaryRefs) if (fetched.has(key)) keep.add(key);

  const added: Resource[] = [];
  for (const provenance of aiProvenances) {
    if (!held.has(resourceKey(provenance) ?? '')) added.push(provenance);
  }
  for (const key of keep) {
    const resource = fetched.get(key);
    if (resource && !held.has(key)) added.push(resource);
  }

  if (added.length > 0) {
    onStatus?.(`Added ${added.length} AI transparency record${added.length === 1 ? '' : 's'}`);
  }
  return added;
}

/** Every resource the kept Provenances depend on, by key. */
function closureOf(
  provenances: Provenance[],
  lookup: (key: string) => Resource | undefined
): Set<string> {
  const keep = new Set<string>();
  const visit = (reference: string | undefined) => {
    const parsed = parseReference(reference);
    if (!parsed || keep.has(parsed.key)) return;
    if (!lookup(parsed.key)) return;
    keep.add(parsed.key);
  };
  for (const provenance of provenances) {
    for (const agent of provenance.agent ?? []) visit(agent.who?.reference);
    for (const entity of provenance.entity ?? []) visit(entity.what?.reference);
  }
  // A Device brings its Model-Card with it.
  for (const key of Array.from(keep)) {
    const resource = lookup(key);
    if (!isAiDevice(resource)) continue;
    for (const extension of (resource as Device).extension ?? []) {
      if (extension.url === MODEL_CARD_EXTENSION) visit(extension.valueReference?.reference);
    }
  }
  return keep;
}

function queue(
  into: Set<string>,
  reference: string | undefined,
  allowedTypes: Set<string>,
  held: Map<string, Resource>,
  fetched: Map<string, Resource>
): void {
  const parsed = parseReference(reference);
  if (!parsed || !allowedTypes.has(parsed.type)) return;
  if (held.has(parsed.key) || fetched.has(parsed.key)) return;
  into.add(parsed.key);
}

async function readInto(keys: Set<string>, request: FhirRequest, fetched: Map<string, Resource>): Promise<void> {
  if (keys.size === 0) return;
  const results = await Promise.allSettled(Array.from(keys).map((key) => request(key)));
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const resource of result.value ?? []) {
      const key = resourceKey(resource);
      if (key && !fetched.has(key)) fetched.set(key, resource);
    }
  }
}

/**
 * `Provenance?target=a,b,c`, batched. Servers that reject a comma-separated
 * reference list get one retry per target, capped; a server with no Provenance
 * search at all is detected after a few failures and the pass is abandoned.
 */
async function searchProvenance(
  targets: string[],
  request: FhirRequest,
  limits: { targetsPerQuery: number; maxIndividualQueries: number }
): Promise<Provenance[]> {
  const found = new Map<string, Provenance>();
  let individualQueries = 0;
  let consecutiveFailures = 0;

  for (const batch of chunk(targets, limits.targetsPerQuery)) {
    let results: Resource[] = [];
    try {
      results = await request(`Provenance?target=${batch.join(',')}&_count=200`);
      consecutiveFailures = 0;
    } catch (error) {
      consecutiveFailures++;
      if (consecutiveFailures >= 3 && found.size === 0) {
        console.warn('AI provenance: this server does not appear to support Provenance search; skipping', error);
        break;
      }
      for (const target of batch) {
        if (individualQueries >= limits.maxIndividualQueries) break;
        individualQueries++;
        try {
          results.push(...(await request(`Provenance?target=${target}`)));
          consecutiveFailures = 0;
        } catch {
          // A server may not support Provenance search at all; keep going until
          // the failure count or the query cap stops us.
        }
      }
    }
    for (const resource of results) {
      if (resource?.resourceType !== 'Provenance') continue;
      const provenance = resource as Provenance;
      if (!isAiProvenanceCandidate(provenance)) continue;
      const key = resourceKey(provenance);
      if (key && !found.has(key)) found.set(key, provenance);
    }
  }

  return Array.from(found.values());
}
