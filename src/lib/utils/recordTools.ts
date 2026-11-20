import { get } from 'svelte/store';
import type { Resource } from 'fhir/r4';
import { PLACEHOLDER_SYSTEM } from '$lib/config/config';
import type { CategorizedResource } from '$lib/stores/categorizedResources';
import type { ResourceCollection } from '$lib/utils/ResourceCollection';
import type { ResourceHelper } from '$lib/utils/ResourceHelper';
import { compactResource } from '$lib/utils/recordContext';
import { collectReferences, ReferenceIndex } from '$lib/utils/referenceIndex';
import { getResourceDateSpan, getSearchText } from '$lib/utils/resourceSearch';

// Client-side implementations of the health chat's record tools (see RECORD_TOOLS in
// $lib/server/healthChat). The model asks for data by tool call; these run in the browser over
// the resources the user has included, so only what the model asks for is sent to the server.

/** Hard cap on results per search, whatever the model asks for */
const MAX_RESULTS = 20;
/** Cap on serialized result size, so one search can't flood the model's context */
const MAX_RESULT_CHARS = 40_000;

interface Item {
  source: string;
  rh: ResourceHelper;
}

function isPlaceholderPatient(resource: Resource) {
  return (
    resource.resourceType === 'Patient' &&
    !!resource.meta?.tag?.find((t) => t.system === PLACEHOLDER_SYSTEM)
  );
}

function collectItems(collections: ResourceCollection[]) {
  const input = collections.map((rc, i) => {
    const resources = (Object.values(get(rc.resources)) as ResourceHelper[]).filter(
      (rh) => rh.resource && rh.include !== false && !isPlaceholderPatient(rh.resource)
    );
    return { source: `dataset-${i}`, resources };
  });
  const items: Item[] = input.flatMap(({ source, resources }) =>
    resources.map((rh) => ({ source, rh }))
  );
  return { items, index: new ReferenceIndex(input) };
}

function isoDate(ms: number | undefined) {
  return ms !== undefined && Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : undefined;
}

/** Resource types present in the record, with counts and date ranges */
export function listRecordTypes(collections: ResourceCollection[]) {
  const { items } = collectItems(collections);
  const byType = new Map<string, { count: number; earliest?: number; latest?: number }>();
  for (const { rh } of items) {
    const entry = byType.get(rh.resource.resourceType) ?? { count: 0 };
    entry.count++;
    const span = getResourceDateSpan(rh.resource);
    if (span && Number.isFinite(span.start)) {
      entry.earliest = Math.min(entry.earliest ?? span.start, span.start);
      entry.latest = Math.max(entry.latest ?? span.start, span.start);
    }
    byType.set(rh.resource.resourceType, entry);
  }
  return [...byType.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([type, e]) => ({ type, count: e.count, earliest: isoDate(e.earliest), latest: isoDate(e.latest) }));
}

// Tells the model why a search came back empty, so it retries instead of concluding the data
// is absent: either the requested types aren't in the record at all, or the text didn't match
function emptyResultHelp(collections: ResourceCollection[], requested: Set<string>) {
  const typesPresent = listRecordTypes(collections).map((t) => t.type);
  const missing = [...requested].filter((r) => !typesPresent.includes(r));
  const note =
    requested.size && missing.length === requested.size
      ? 'The record contains no resources of the requested types.'
      : 'No resources matched all of the filters.';
  return { note, typesPresent };
}

// A resource's status codes: status (e.g. MedicationRequest "active") and, for types that
// have it, clinicalStatus (e.g. Condition / AllergyIntolerance "active", "resolved")
function statusCodes(resource: Resource): string[] {
  const r = resource as { status?: unknown; clinicalStatus?: { coding?: { code?: string }[] } };
  const codes: string[] = [];
  if (typeof r.status === 'string') codes.push(r.status.toLowerCase());
  for (const coding of r.clinicalStatus?.coding ?? []) {
    if (coding.code) codes.push(coding.code.toLowerCase());
  }
  return codes;
}

export interface SearchRecordsArgs {
  types?: string[];
  status?: string[];
  text?: string;
  since?: string;
  until?: string;
  limit?: number;
}

/**
 * Resources matching every given filter, newest first. Text matches when every word appears
 * in the resource or the resources it references (e.g. the Medication behind a
 * MedicationRequest). Referenced resources are attached to each result as "referenced".
 */
export function searchRecords(collections: ResourceCollection[], args: SearchRecordsArgs) {
  const { items, index } = collectItems(collections);
  const words = (args.text ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const since = args.since ? Date.parse(args.since) : undefined;
  const until = args.until ? Date.parse(args.until) : undefined;
  const limit = Math.min(Math.max(1, Math.floor(args.limit ?? 10)), MAX_RESULTS);
  const types = new Set(args.types ?? []);
  const statuses = new Set((args.status ?? []).map((s) => s.toLowerCase()));

  const matches = items
    .filter(({ rh }) => !types.size || types.has(rh.resource.resourceType))
    .filter(({ rh }) => !statuses.size || statusCodes(rh.resource).some((s) => statuses.has(s)))
    .filter((item) => {
      if (!words.length) return true;
      const text = getSearchText(item as CategorizedResource, index);
      return words.every((w) => text.includes(w));
    })
    .map((item) => ({ item, span: getResourceDateSpan(item.rh.resource) }))
    .filter(({ span }) => {
      if (since === undefined && until === undefined) return true;
      if (!span) return false;
      if (since !== undefined && !Number.isNaN(since) && span.end < since) return false;
      if (until !== undefined && !Number.isNaN(until) && span.start > until) return false;
      return true;
    })
    // Newest first; undated resources last
    .sort((a, b) => (b.span?.start ?? -Infinity) - (a.span?.start ?? -Infinity));

  const results: Record<string, unknown>[] = [];
  let length = 0;
  for (const { item } of matches.slice(0, limit)) {
    const result = compactResource(item.rh.resource);
    const referenced = collectReferences(item.rh.resource)
      .map((ref) => index.resolve(ref, item.source))
      .filter((t) => t && t.rh.resource.resourceType !== 'Patient')
      .map((t) => compactResource(t!.rh.resource));
    if (referenced.length) result.referenced = referenced;
    const size = JSON.stringify(result).length;
    if (results.length && length + size > MAX_RESULT_CHARS) break;
    results.push(result);
    length += size;
  }

  // Lets the model narrow a broad search by type when only some results fit
  const matchesByType: Record<string, number> = {};
  for (const { item } of matches) {
    const type = item.rh.resource.resourceType;
    matchesByType[type] = (matchesByType[type] ?? 0) + 1;
  }

  return {
    totalMatches: matches.length,
    returned: results.length,
    matchesByType,
    ...(results.length < matches.length && {
      note: `Incomplete: ${results.length} of ${matches.length} matches returned.`
    }),
    results,
    // Help the model recover from an empty search instead of concluding the data is absent
    ...(matches.length === 0 && emptyResultHelp(collections, types))
  };
}
