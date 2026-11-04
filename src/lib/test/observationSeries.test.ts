import { describe, expect, it } from 'vitest';
import {
  buildObservationPanels,
  buildObservationSeries,
  buildObservationSeriesIndex,
  chartScalesFor,
  sparklineSeriesFor,
  type SeriesItem
} from '$lib/utils/observationSparkline';

const LOINC = 'http://loinc.org';
const SNOMED = 'http://snomed.info/sct';
const HEIGHT = { system: LOINC, code: '8302-2' };       // Body height
const HEIGHT_ALT = { system: SNOMED, code: '50373000' }; // Body height (SNOMED)
const VITALS = { system: LOINC, code: '85353-1' };       // Vital signs panel

const observation = (id: string, codings: object[], value: number, unit: string, date: string): SeriesItem => ({
  id,
  resource: {
    resourceType: 'Observation',
    id,
    status: 'final',
    code: { coding: codings },
    valueQuantity: { value, unit, code: unit },
    effectiveDateTime: date
  } as any
});

describe('observation series', () => {
  it('groups a single-coded observation with the multi-coded series that carries its code', () => {
    const items = [
      observation('a', [HEIGHT_ALT, HEIGHT, VITALS], 170, 'cm', '2020-01-01'),
      observation('b', [HEIGHT_ALT, HEIGHT, VITALS], 171, 'cm', '2021-01-01'),
      observation('c', [HEIGHT], 172, 'cm', '2022-01-01')
    ];
    const series = buildObservationSeries(items);
    expect(series.size).toBe(1);
    expect([...series.values()][0].map(p => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps single-coded observations apart when no multi-coded series has their code', () => {
    const items = [
      observation('a', [HEIGHT_ALT, HEIGHT, VITALS], 170, 'cm', '2020-01-01'),
      observation('b', [HEIGHT_ALT, HEIGHT, VITALS], 171, 'cm', '2021-01-01'),
      observation('c', [{ system: LOINC, code: '29463-7' }], 70, 'kg', '2022-01-01')
    ];
    const series = buildObservationSeries(items);
    expect(series.size).toBe(2);
  });

  it('keeps observations in different units in one series, each point carrying its unit', () => {
    const items = [
      observation('a', [HEIGHT_ALT, HEIGHT], 170, 'cm', '2020-01-01'),
      observation('b', [HEIGHT_ALT, HEIGHT], 171, 'cm', '2021-01-01'),
      observation('c', [HEIGHT], 68, '[in_i]', '2022-01-01')
    ];
    const series = buildObservationSeries(items);
    expect(series.size).toBe(1);
    expect([...series.values()][0].map(p => [p.id, p.unit])).toEqual([['a', 'cm'], ['b', 'cm'], ['c', '[in_i]']]);
  });

  it('splits a series into scales by unit, most common first and at most two', () => {
    const points = [
      ...[1, 2, 3].map(i => ({ id: `k${i}`, y: i, time: i, unit: 'kg', unitLabel: 'kg' })),
      ...[1, 2].map(i => ({ id: `l${i}`, y: i, time: 10 + i, unit: '[lb_av]', unitLabel: 'lb' })),
      { id: 'g1', y: 5000, time: 20, unit: 'g', unitLabel: 'g' }
    ];
    const scales = chartScalesFor(points);
    expect(scales.map(scale => scale.unit)).toEqual(['kg', '[lb_av]']);
    expect(scales[0].points).toHaveLength(3);
  });

  it('gives a unit a scale only when more than one observation uses it', () => {
    const point = (id: string, unit: string) => ({ id, y: 1, time: 1, unit, unitLabel: unit });
    // The second unit is used once, so only the first gets an axis
    expect(chartScalesFor([point('a', 'kg'), point('b', 'kg'), point('c', 'g')]).map(scale => scale.unit)).toEqual(['kg']);
    // Every unit used once: nothing to chart
    expect(chartScalesFor([point('a', 'kg'), point('b', 'g')])).toEqual([]);
  });

  it('draws a sparkline only from values in the observation\'s own unit', () => {
    const items = [
      observation('a', [HEIGHT], 170, 'cm', '2020-01-01'),
      observation('b', [HEIGHT], 171, 'cm', '2021-01-01'),
      observation('c', [HEIGHT], 68, '[in_i]', '2022-01-01')
    ];
    const index = buildObservationSeriesIndex(items);
    expect(sparklineSeriesFor(items[0].resource as any, index)?.map(p => p.id)).toEqual(['a', 'b']);
    // Alone in its unit, so there is nothing to compare it with
    expect(sparklineSeriesFor(items[2].resource as any, index)).toBeUndefined();
  });

  it('does not pull in observations that only share a broad code with a series', () => {
    // Multi-coded observations of two different things both carry "vital signs"; a single-coded
    // observation of something else is not matched through it, since it has only its own code
    const items = [
      observation('a', [HEIGHT, VITALS], 170, 'cm', '2020-01-01'),
      observation('b', [HEIGHT, VITALS], 171, 'cm', '2021-01-01'),
      observation('c', [{ system: LOINC, code: '8310-5' }], 170, 'cm', '2022-01-01')
    ];
    const index = buildObservationSeriesIndex(items);
    expect(index.keyOf(items[2].resource)).not.toBe(index.keyOf(items[0].resource));
  });

  it('finds the shared series for a single-coded observation', () => {
    const items = [
      observation('a', [HEIGHT_ALT, HEIGHT], 170, 'cm', '2020-01-01'),
      observation('b', [HEIGHT_ALT, HEIGHT], 171, 'cm', '2021-01-01'),
      observation('c', [HEIGHT], 172, 'cm', '2022-01-01')
    ];
    const index = buildObservationSeriesIndex(items);
    expect(sparklineSeriesFor(items[2].resource as any, index)?.map(p => p.id)).toEqual(['a', 'b', 'c']);
  });
});

const BP = { system: LOINC, code: '85354-9' };            // Blood pressure panel
const BP_ALT = { system: SNOMED, code: '75367002' };      // Blood pressure (SNOMED)
const SYSTOLIC = { coding: [{ system: LOINC, code: '8480-6' }] };
const DIASTOLIC = { coding: [{ system: LOINC, code: '8462-4' }] };

const bloodPressure = (id: string, codings: object[], date: string, components = [SYSTOLIC, DIASTOLIC]): SeriesItem => ({
  id,
  resource: {
    resourceType: 'Observation',
    id,
    status: 'final',
    code: { coding: codings },
    effectiveDateTime: date,
    component: components.map(code => ({ code, valueQuantity: { value: 120, unit: 'mmHg', code: 'mm[Hg]' } }))
  } as any
});

describe('observation panels', () => {
  it('groups a single-coded panel with the multi-coded panel that carries its code', () => {
    const items = [
      bloodPressure('a', [BP_ALT, BP, VITALS], '2020-01-01'),
      bloodPressure('b', [BP_ALT, BP, VITALS], '2021-01-01'),
      bloodPressure('c', [BP], '2022-01-01')
    ];
    const panels = buildObservationPanels(items);
    expect(panels.size).toBe(1);
    expect([...[...panels.values()][0].memberIds]).toEqual(['a', 'b', 'c']);
  });

  it('keeps a single-coded panel apart when its components do not match', () => {
    const items = [
      bloodPressure('a', [BP_ALT, BP, VITALS], '2020-01-01'),
      bloodPressure('b', [BP_ALT, BP, VITALS], '2021-01-01'),
      bloodPressure('c', [BP], '2022-01-01', [{ coding: [{ system: LOINC, code: '9999-9' }] }])
    ];
    expect(buildObservationPanels(items).size).toBe(2);
  });

  it('keeps single-coded panels apart when no multi-coded panel has their code', () => {
    const items = [
      bloodPressure('a', [BP_ALT, BP], '2020-01-01'),
      bloodPressure('b', [BP_ALT, BP], '2021-01-01'),
      bloodPressure('c', [VITALS], '2022-01-01')
    ];
    expect(buildObservationPanels(items).size).toBe(2);
  });
});
