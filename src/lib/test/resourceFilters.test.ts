import { describe, it, expect, vi } from 'vitest';
import { get, readable } from 'svelte/store';
import { createCategorizedStore, type ResourceInput } from '$lib/stores/categorizedResources';
import {
  createFilterStore,
  SEARCH_DEBOUNCE_MS,
  emptyCriteria,
  filterUnits,
  type FilterCriteria
} from '$lib/stores/resourceFilters';
import { ResourceHelper } from '$lib/utils/ResourceHelper';

const condition = (id: string, text: string, onsetDateTime?: string) => ({
  resourceType: 'Condition',
  id,
  code: { text },
  ...(onsetDateTime ? { onsetDateTime } : {})
});

const loinc = { coding: [{ system: 'http://loinc.org', code: '2345-7', display: 'Glucose' }] };
const reading = (id: string, value: number, effectiveDateTime: string) => ({
  resourceType: 'Observation',
  id,
  status: 'final',
  code: loinc,
  valueQuantity: { value, unit: 'mg/dL', code: 'mg/dL', system: 'http://unitsofmeasure.org' },
  effectiveDateTime
});

// Clinic A: hypertension (2020), a request for a medication it references. Clinic B: asthma (2018)
// and one glucose reading. Clinic A also has a glucose reading, so the two readings form a series.
const input: ResourceInput = [
  {
    source: 'Clinic A',
    resources: [
      condition('c1', 'Hypertension', '2020-05-10'),
      { resourceType: 'Medication', id: 'med1', code: { text: 'Lisinopril' } },
      { resourceType: 'MedicationRequest', id: 'mr1', status: 'active', intent: 'order', medicationReference: { reference: 'Medication/med1' } },
      reading('g1', 90, '2021-01-01')
    ].map(r => new ResourceHelper(r as any))
  },
  {
    source: 'Clinic B',
    resources: [condition('c2', 'Asthma', '2018'), reading('g2', 95, '2022-06-01')].map(r => new ResourceHelper(r as any))
  }
];

function run(overrides: Partial<FilterCriteria>) {
  const { unitsStore, referenceIndex } = createCategorizedStore(readable(input));
  const units = get(unitsStore);
  return {
    units,
    result: filterUnits(units, { ...emptyCriteria(), ...overrides }, { index: get(referenceIndex) })
  };
}

// "Conditions: Hypertension, Asthma" style summary of what survived
const summarize = (units: Record<string, any[]>) =>
  Object.fromEntries(
    Object.entries(units).map(([category, list]) => [
      category,
      list.map(u => (u.kind === 'group' ? u.groupType : u.item.rh.resource.id)).sort()
    ])
  );

describe('filterUnits', () => {
  it('returns everything for empty criteria', () => {
    const { units, result } = run({});
    expect(result).toEqual(units);
  });

  it('filters by source, keeping a group when any member comes from a selected source', () => {
    const { result } = run({ sources: new Set(['Clinic B']) });
    expect(summarize(result)).toEqual({
      Conditions: ['c2'],
      'Other Observations': ['observationSeries']
    });
  });

  it('combines sources with OR', () => {
    const { result } = run({ sources: new Set(['Clinic A', 'Clinic B']), sections: new Set(['Conditions']) });
    expect(summarize(result)).toEqual({ Conditions: ['c1', 'c2'] });
  });

  it('filters by section', () => {
    const { result } = run({ sections: new Set(['Medications']) });
    expect(Object.keys(result)).toEqual(['Medications']);
  });

  it('searches resource text, case-insensitively', () => {
    expect(summarize(run({ text: 'HYPERTENSION' }).result)).toEqual({ Conditions: ['c1'] });
  });

  it('searches the text of directly referenced resources', () => {
    const { result } = run({ text: 'lisinopril' });
    // The Medication itself matches too, since it is a unit of its own
    expect(summarize(result)).toEqual({ Medications: ['med1', 'mr1'] });
  });

  it('searches source and section names', () => {
    expect(summarize(run({ text: 'clinic b asthma' }).result)).toEqual({ Conditions: ['c2'] });
    expect(Object.keys(run({ text: 'conditions' }).result)).toEqual(['Conditions']);
  });

  it('requires every search term', () => {
    expect(run({ text: 'asthma hypertension' }).result).toEqual({});
  });

  it('filters by date range and keeps undated resources', () => {
    const { result } = run({ dateFrom: '2020-01-01', dateTo: '2020-12-31' });
    expect(summarize(result)).toEqual({
      Conditions: ['c1'],
      // Undated: no sortFields date, so never excluded by a date filter
      Medications: ['med1', 'mr1']
    });
  });

  it('treats the upper bound as the end of its day', () => {
    const { result } = run({ dateFrom: '2020-05-10', dateTo: '2020-05-10', sections: new Set(['Conditions']) });
    expect(summarize(result)).toEqual({ Conditions: ['c1'] });
  });

  it('keeps a year-precision date that overlaps the range', () => {
    const { result } = run({ dateFrom: '2018-06-01', dateTo: '2018-06-30', sections: new Set(['Conditions']) });
    expect(summarize(result)).toEqual({ Conditions: ['c2'] });
  });

  it('keeps a group when any member is in range', () => {
    const { result } = run({ dateFrom: '2022-01-01', sections: new Set(['Other Observations']) });
    expect(summarize(result)).toEqual({ 'Other Observations': ['observationSeries'] });
  });

  it('combines facets with AND', () => {
    expect(run({ sources: new Set(['Clinic A']), text: 'asthma' }).result).toEqual({});
  });
});

describe('createFilterStore', () => {
  it('toggles selections and reports whether any filter is active', () => {
    const filters = createFilterStore();
    expect(get(filters.isActive)).toBe(false);

    filters.toggleSource('Clinic A');
    expect(get(filters).sources.has('Clinic A')).toBe(true);
    expect(get(filters.isActive)).toBe(true);

    filters.toggleSource('Clinic A');
    expect(get(filters.isActive)).toBe(false);
  });

  it('clears each facet independently and resets all', () => {
    const filters = createFilterStore();
    filters.toggleSource('Clinic A');
    filters.toggleSection('Conditions');
    filters.setDateRange('2020-01-01', '');
    filters.setText('x');

    filters.clearSources();
    filters.clearDates();
    expect(get(filters).sections.has('Conditions')).toBe(true);
    expect(get(filters).text).toBe('x');
    expect(get(filters).sources.size).toBe(0);
    expect(get(filters).dateFrom).toBe('');

    filters.reset();
    expect(get(filters.isActive)).toBe(false);
  });

  it('applies debounced text once typing pauses, using only the last value', () => {
    vi.useFakeTimers();
    try {
      const filters = createFilterStore();
      filters.setTextDebounced('a');
      filters.setTextDebounced('as');
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
      expect(get(filters).text).toBe('');
      vi.advanceTimersByTime(1);
      expect(get(filters).text).toBe('as');
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops queued text when the text is set directly or the filters are reset', () => {
    vi.useFakeTimers();
    try {
      const filters = createFilterStore();
      filters.setTextDebounced('queued');
      filters.setText('');
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      expect(get(filters).text).toBe('');

      filters.setTextDebounced('queued');
      filters.reset();
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
      expect(get(filters).text).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });
});
