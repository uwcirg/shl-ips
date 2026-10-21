import { describe, it, expect } from 'vitest';
import { get, readable } from 'svelte/store';
import type { Bundle } from 'fhir/r4';
import { createCategorizedStore, UNCATEGORIZED } from '$lib/stores/categorizedResources';
import type { DisplayUnit } from '$lib/stores/displayUnits';
import { createIpsCategorizer, type IpsSectionInput } from '$lib/utils/ipsCategorizer';

const loinc = (code: string) => ({ coding: [{ system: 'http://loinc.org', code, display: code }] });

function observation(id: string, code: string, value: number, date: string) {
  return {
    resourceType: 'Observation',
    id,
    status: 'final',
    code: loinc(code),
    valueQuantity: { value, unit: 'mg/dL', code: 'mg/dL', system: 'http://unitsofmeasure.org' },
    effectiveDateTime: date
  };
}

const entry = (id: string, resource: any) => ({ fullUrl: `urn:uuid:${id}`, resource: { ...resource, id } });

// The report references o1; o1 and o2 are two readings of one series; oc is unrelated.
function bundle(): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'document',
    entry: [
      entry('rep', {
        resourceType: 'DiagnosticReport',
        status: 'final',
        code: loinc('58410-2'),
        result: [{ reference: 'urn:uuid:o1' }]
      }),
      entry('o1', observation('o1', '2345-7', 90, '2023-01-01')),
      entry('o2', observation('o2', '2345-7', 95, '2023-02-01')),
      entry('oc', observation('oc', '9999-9', 1, '2023-03-01')),
      entry('pr', { resourceType: 'Practitioner', name: [{ family: 'Unlisted' }] })
    ]
  } as Bundle;
}

function units(sections: IpsSectionInput[], b: Bundle = bundle()): Record<string, DisplayUnit[]> {
  const { input, categorize, sort } = createIpsCategorizer(b, sections);
  return get(createCategorizedStore(readable(input), { categorize, sort }).unitsStore);
}

const describeUnit = (unit: DisplayUnit) =>
  unit.kind === 'group' ? unit.groupType : `single:${unit.item.rh.resource.id}`;

describe('createIpsCategorizer with createCategorizedStore', () => {
  const sections = [
    { title: 'Results', references: ['urn:uuid:rep', 'urn:uuid:oc', 'urn:uuid:o1'] },
    { title: 'Vitals', references: ['urn:uuid:o2'] }
  ];

  it('lists a report group at its anchor, in Composition order, with absorbed resources hidden', () => {
    const result = units(sections);
    // report first (listed first), then the lone observation, then the series at its first member.
    // o1 is in the report group and the series, so it has no standalone row.
    expect(result['Results'].map(describeUnit)).toEqual(['diagnosticReport', 'single:oc', 'observationSeries']);
  });

  it('shows a series once, and leaves the other section without its reading', () => {
    expect(units(sections)['Vitals']).toBeUndefined();
  });

  it('gives resources no section lists no row of their own', () => {
    const result = units(sections);
    expect(Object.keys(result).sort()).toEqual(['Results']);
    expect(Object.keys(result)).not.toContain(UNCATEGORIZED);
  });

  it('places a group by its first listed member when its anchor is not listed', () => {
    const result = units([{ title: 'Results', references: ['urn:uuid:o1'] }]);
    // The unlisted report still groups o1 and is placed by it. o1's series (with the unlisted o2)
    // is placed the same way; unlisted resources still count as group members.
    expect(result['Results'].map(describeUnit)).toEqual(['diagnosticReport', 'observationSeries']);
  });

  it('resolves references written as Type/id and keeps unrelated resources single', () => {
    const result = units([{ title: 'Labs', references: ['Observation/oc'] }]);
    expect(result['Labs'].map(describeUnit)).toEqual(['single:oc']);
  });

  it('places resources it is handed directly (e.g. the Patient)', () => {
    const b = bundle();
    const practitioner = b.entry![4].resource!;
    const result = units([{ title: 'People', resources: [practitioner] }], b);
    expect(result['People'].map(describeUnit)).toEqual(['single:pr']);
  });
});
