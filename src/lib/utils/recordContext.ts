import { get } from 'svelte/store';
import type { Resource } from 'fhir/r4';
import { PLACEHOLDER_SYSTEM } from '$lib/config/config';
import { MAX_RECORD_CHARS } from '$lib/config/chat';
import type { ResourceCollection } from '$lib/utils/ResourceCollection';
import type { ResourceHelper } from '$lib/utils/ResourceHelper';

export interface RecordContext {
  /** Serialized record: "## ResourceType" headers, then one compact JSON resource per line */
  text: string;
  /** Resources included in text */
  count: number;
  /** Resources left out because the record was over the size budget */
  omitted: number;
}

// Resource types most useful for answering questions come first, so they survive truncation
const TYPE_PRIORITY = [
  'Patient',
  'AllergyIntolerance',
  'Condition',
  'MedicationStatement',
  'MedicationRequest',
  'Medication',
  'Immunization',
  'Procedure',
  'Observation',
  'DiagnosticReport',
  'CarePlan',
  'Encounter'
];

// Bulky fields that carry little meaning for the model. Narrative (top-level text) duplicates
// the structured data; meta and identifiers are bookkeeping. CodeableConcept.text and the like
// are kept because only the top-level keys are dropped.
const TOP_LEVEL_SKIP = new Set(['meta', 'text', 'identifier']);
// Extensions are noise in nearly every record and can appear at any depth
const SKIP_ANYWHERE = new Set(['extension', 'modifierExtension']);

function compact(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(compact).filter((v) => v !== undefined);
    return items.length ? items : undefined;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (SKIP_ANYWHERE.has(key)) continue;
      const compacted = compact(child);
      if (compacted !== undefined) out[key] = compacted;
    }
    return Object.keys(out).length ? out : undefined;
  }
  if (value === '' || value === null) return undefined;
  return value;
}

/**
 * A resource as sent to the model: ids and references are kept so related resources can be
 * linked (e.g. MedicationRequest.medicationReference -> Medication), everything else in
 * TOP_LEVEL_SKIP / SKIP_ANYWHERE is removed, as are empty values.
 */
export function compactResource(resource: Resource): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(resource)) {
    if (TOP_LEVEL_SKIP.has(key) || SKIP_ANYWHERE.has(key)) continue;
    const compacted = compact(value);
    if (compacted !== undefined) out[key] = compacted;
  }
  return out;
}

function isPlaceholderPatient(resource: Resource) {
  return (
    resource.resourceType === 'Patient' &&
    !!resource.meta?.tag?.find((t) => t.system === PLACEHOLDER_SYSTEM)
  );
}

function typeRank(type: string) {
  const index = TYPE_PRIORITY.indexOf(type);
  return index === -1 ? TYPE_PRIORITY.length : index;
}

/**
 * Serializes the patient's included resources, across every dataset, as context for the
 * health record chat. Stops adding resources once maxChars would be exceeded and reports how
 * many were left out.
 */
export function buildRecordContext(
  collections: ResourceCollection[],
  maxChars = MAX_RECORD_CHARS
): RecordContext {
  const byType = new Map<string, Resource[]>();
  for (const rc of collections) {
    for (const rh of Object.values(get(rc.resources)) as ResourceHelper[]) {
      const resource = rh.resource;
      if (!resource || rh.include === false || isPlaceholderPatient(resource)) continue;
      const list = byType.get(resource.resourceType) ?? [];
      list.push(resource);
      byType.set(resource.resourceType, list);
    }
  }

  const types = [...byType.keys()].sort((a, b) => typeRank(a) - typeRank(b) || a.localeCompare(b));

  const lines: string[] = [];
  let length = 0;
  let count = 0;
  let omitted = 0;
  for (const type of types) {
    const resources = byType.get(type)!;
    const header = `## ${type}`;
    let headerAdded = false;
    for (const resource of resources) {
      const line = JSON.stringify(compactResource(resource));
      const added = line.length + 1 + (headerAdded ? 0 : header.length + 1);
      if (omitted > 0 || length + added > maxChars) {
        omitted++;
        continue;
      }
      if (!headerAdded) {
        lines.push(header);
        headerAdded = true;
      }
      lines.push(line);
      length += added;
      count++;
    }
  }

  return { text: lines.join('\n'), count, omitted };
}
