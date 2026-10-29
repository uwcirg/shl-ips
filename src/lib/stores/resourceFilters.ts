/***
Filter state for a unit list (e.g. the data summary), and a pure function to apply it. Facets
combine with AND; selections within a facet combine with OR; an empty facet is no constraint.
Each page that wants filtering creates its own store, so filters are not shared between pages.

  const filters = createFilterStore();
  setContext('resourceFilters', filters);
  filters.toggleSource('Patient Authored Data');
  filters.setText('lisinopril');
  const visible = filterUnits(get(unitsStore), get(filters), { index: get(referenceIndex) });
***/

import { derived, writable } from 'svelte/store';
import type { UnitMap } from '$lib/stores/categorizedResources';
import { categoryTitle } from '$lib/stores/categorizedResources';
import { unitItems, type DisplayUnit } from '$lib/stores/displayUnits';
import type { ReferenceIndex } from '$lib/utils/referenceIndex';
import { getFriendlySourceNameBySource } from '$lib/utils/resourceCollectionUtils';
import { getResourceDateSpan, getSearchText, type DateSpan } from '$lib/utils/resourceSearch';
import { normalizeDateString } from '$lib/utils/util';

export interface FilterCriteria {
  sources: Set<string>;   // friendly source names
  sections: Set<string>;  // category names
  dateFrom: string;       // YYYY-MM-DD, or '' for no lower bound
  dateTo: string;         // YYYY-MM-DD, or '' for no upper bound
  text: string;
}

export const emptyCriteria = (): FilterCriteria => ({
  sources: new Set(),
  sections: new Set(),
  dateFrom: '',
  dateTo: '',
  text: ''
});

// Filters other than text, i.e. those that live in a collapsible panel
export const panelFilterCount = (c: FilterCriteria) =>
  (c.sources.size > 0 ? 1 : 0) + (c.sections.size > 0 ? 1 : 0) + (c.dateFrom || c.dateTo ? 1 : 0);

export const isCriteriaActive = (c: FilterCriteria) => panelFilterCount(c) > 0 || c.text.trim() !== '';

export function createFilterStore() {
  const store = writable<FilterCriteria>(emptyCriteria());
  const toggle = (key: 'sources' | 'sections', value: string) =>
    store.update(c => {
      const next = new Set(c[key]);
      if (!next.delete(value)) next.add(value);
      return { ...c, [key]: next };
    });

  return {
    subscribe: store.subscribe,
    isActive: derived(store, isCriteriaActive),
    toggleSource: (name: string) => toggle('sources', name),
    toggleSection: (category: string) => toggle('sections', category),
    clearSources: () => store.update(c => ({ ...c, sources: new Set() })),
    clearSections: () => store.update(c => ({ ...c, sections: new Set() })),
    setDateRange: (dateFrom: string, dateTo: string) => store.update(c => ({ ...c, dateFrom, dateTo })),
    clearDates: () => store.update(c => ({ ...c, dateFrom: '', dateTo: '' })),
    setText: (text: string) => store.update(c => ({ ...c, text })),
    reset: () => store.set(emptyCriteria())
  };
}

export type ResourceFilterStore = ReturnType<typeof createFilterStore>;

export interface FilterOptions {
  index?: ReferenceIndex;  // lets text search include referenced resources
}

// The bounds are whole days, so the upper bound runs to the end of its day
function dateRange(c: FilterCriteria): DateSpan | undefined {
  if (!c.dateFrom && !c.dateTo) return undefined;
  const from = normalizeDateString(c.dateFrom);
  const to = normalizeDateString(c.dateTo);
  return {
    start: from ? from.date.getTime() : -Infinity,
    end: to ? to.date.getTime() + 24 * 60 * 60 * 1000 - 1 : Infinity
  };
}

// A unit is in range if any member overlaps it. Undated members never exclude a unit, and a unit
// with no dated member at all always shows (e.g. a Medication, which is only shown for context).
function unitInRange(unit: DisplayUnit, range: DateSpan): boolean {
  const spans = unitItems(unit)
    .map(item => getResourceDateSpan(item.rh.resource))
    .filter((span): span is DateSpan => span !== undefined);
  if (spans.length === 0) return true;
  return spans.some(span => span.end >= range.start && span.start <= range.end);
}

export function filterUnits(units: UnitMap, c: FilterCriteria, options: FilterOptions = {}): UnitMap {
  const terms = c.text.toLowerCase().split(/\s+/).filter(Boolean);
  const range = dateRange(c);
  const result: UnitMap = {};

  for (const [category, list] of Object.entries(units)) {
    if (c.sections.size > 0 && !c.sections.has(category)) continue;
    const title = categoryTitle(category).toLowerCase();

    const kept = list.filter(unit => {
      const items = unitItems(unit);
      const sourceNames = items.map(item => getFriendlySourceNameBySource(item.source));
      if (c.sources.size > 0 && !sourceNames.some(name => c.sources.has(name))) return false;
      if (range && !unitInRange(unit, range)) return false;
      if (terms.length > 0) {
        // Source and section are context rather than resource content, so they join the
        // haystack here instead of the per-resource search text
        const haystack = [
          title,
          ...sourceNames.map(name => name.toLowerCase()),
          ...items.map(item => getSearchText(item, options.index))
        ].join(' ');
        if (!terms.every(term => haystack.includes(term))) return false;
      }
      return true;
    });
    if (kept.length > 0) result[category] = kept;
  }
  return result;
}
