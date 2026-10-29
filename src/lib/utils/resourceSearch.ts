/***
Per-resource helpers for filtering: the date span a resource covers, and the text it can be
searched by. Both are independent of what the display templates show.

  getResourceDateSpan(resource)          // { start, end } in ms, or undefined if the type has no date
  getSearchText(item, referenceIndex)    // lowercased text, including directly referenced resources
***/

import type { Resource } from 'fhir/r4';
import type { CategorizedResource } from '$lib/stores/categorizedResources';
import { RESOURCE_CONFIG } from '$lib/config/resource_config';
import { collectReferences, type ReferenceIndex } from '$lib/utils/referenceIndex';
import { choiceDTFields, normalizeDateString } from '$lib/utils/util';

export interface DateSpan {
  start: number;
  end: number;
}

// Precision values from normalizeDateString: 1 year, 2 month, 3 day, 4 time
function spanOf(dateStr: string | undefined): DateSpan | undefined {
  const parsed = normalizeDateString(dateStr);
  if (!parsed) return undefined;
  const { date, precision } = parsed;
  const start = date.getTime();
  const next = new Date(date);
  if (precision === 1) next.setFullYear(next.getFullYear() + 1);
  else if (precision === 2) next.setMonth(next.getMonth() + 1);
  else if (precision === 3) next.setDate(next.getDate() + 1);
  else next.setTime(start + 1);
  return { start, end: next.getTime() - 1 };
}

// The span a resource covers, from the first of its type's sortFields that has a usable date.
// A period missing its start or end is open-ended. Undefined means the resource is undated.
export function getResourceDateSpan(resource: Resource): DateSpan | undefined {
  for (const prefix of RESOURCE_CONFIG[resource.resourceType]?.sortFields ?? []) {
    const fields = choiceDTFields(prefix, resource);
    if (!fields) continue;
    const point = fields.dateTime || fields.date || fields.string;
    if (point) {
      const span = spanOf(point);
      if (span) return span;
    }
    if (fields.period) {
      const start = spanOf(fields.period.start);
      const end = spanOf(fields.period.end);
      if (start || end) {
        return { start: start?.start ?? -Infinity, end: end?.end ?? Infinity };
      }
    }
  }
  return undefined;
}

// Structural keys that carry no searchable content
const SKIP_KEYS = new Set([
  'resourceType', 'id', 'meta', 'contained', 'extension', 'modifierExtension', 'implicitRules',
  'language', 'system', 'url', 'reference'
]);

// Every string and number leaf, except structural keys and the generated narrative
function collectText(value: unknown, out: string[]) {
  if (typeof value === 'string' || typeof value === 'number') {
    out.push(String(value));
  } else if (Array.isArray(value)) {
    value.forEach(v => collectText(v, out));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (SKIP_KEYS.has(key)) continue;
      // Narrative (text.div) duplicates the structured data
      if (key === 'text' && child && typeof child === 'object' && 'div' in child) continue;
      collectText(child, out);
    }
  }
}

// Text depends on what the index resolves, so cache per index
const cache = new WeakMap<object, WeakMap<object, string>>();
const NO_INDEX = {};

// Lowercased searchable text for a resource, plus that of the resources it references (one level
// deep, e.g. the Medication behind a MedicationRequest). Patient references are left out: every
// resource points at the patient, so including them would make a patient's name match everything.
export function getSearchText(item: CategorizedResource, index?: ReferenceIndex): string {
  const perIndex = cache.get(index ?? NO_INDEX) ?? new WeakMap<object, string>();
  cache.set(index ?? NO_INDEX, perIndex);
  const cached = perIndex.get(item.rh);
  if (cached !== undefined) return cached;

  const parts: string[] = [];
  collectText(item.rh.resource, parts);
  if (index) {
    for (const ref of collectReferences(item.rh.resource)) {
      const target = index.resolve(ref, item.source);
      if (target && target.rh.resource.resourceType !== 'Patient') {
        collectText(target.rh.resource, parts);
      }
    }
  }
  const text = parts.join(' ').toLowerCase();
  perIndex.set(item.rh, text);
  return text;
}
