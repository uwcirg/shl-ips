import { describe, it, expect } from 'vitest';
import { ResourceHelper } from '$lib/utils/ResourceHelper';
import { ReferenceIndex } from '$lib/utils/referenceIndex';
import {
  buildDisplayUnits,
  encounterGrouper,
  type DisplayUnit,
  type EncounterData,
  type GroupUnit
} from '$lib/stores/displayUnits';
import type { CategorizedResource } from '$lib/stores/categorizedResources';

const resource = (resourceType: string, id: string, extra: Record<string, unknown> = {}) => ({
  resourceType,
  id,
  ...extra
});
const encounter = (id: string, extra: Record<string, unknown> = {}) =>
  resource('Encounter', id, { status: 'finished', class: { display: 'inpatient' }, ...extra });

function units(
  inputs: Array<{ source: string, resources: Array<Record<string, any>> }>
): DisplayUnit[] {
  const grouped = inputs.map(({ source, resources }) => ({
    source,
    resources: resources.map(r => new ResourceHelper(r as any))
  }));
  const items: CategorizedResource[] = grouped.flatMap(({ source, resources }) =>
    resources.map(rh => ({ source, rh, renderInfo: { mode: 'raw' as const } }))
  );
  return buildDisplayUnits(items, new ReferenceIndex(grouped), [encounterGrouper]);
}

const describeUnit = (unit: DisplayUnit) =>
  unit.kind === 'group' ? `group:${unit.anchor?.rh.resource.id}` : `single:${unit.item.rh.resource.id}`;
const memberIds = (unit: DisplayUnit) =>
  (unit as GroupUnit).members.map(member => member.rh.resource.id).sort();

describe('encounterGrouper', () => {
  const direct = encounter('e1', {
    serviceProvider: { reference: 'Organization/o1', display: 'General Hospital' },
    participant: [{ individual: { reference: 'Practitioner/p1', display: 'Dr Who' } }],
    location: [{ location: { reference: 'Location/l1', display: 'Ward 3' } }]
  });

  it('groups an Encounter with the organization, practitioner and location it references', () => {
    const result = units([{
      source: 'a',
      resources: [
        direct,
        resource('Organization', 'o1', { name: 'General Hospital' }),
        resource('Practitioner', 'p1', { name: [{ family: 'Who' }] }),
        resource('Location', 'l1', { name: 'Ward 3' })
      ]
    }]);
    // everything referenced is absorbed, so only the Encounter's group remains
    expect(result.map(describeUnit)).toEqual(['group:e1']);
    expect(memberIds(result[0])).toEqual(['e1', 'l1', 'o1', 'p1']);
    const data = (result[0] as GroupUnit<EncounterData>).data;
    expect(Object.keys(data.related).sort()).toEqual(['Location/l1', 'Organization/o1', 'Practitioner/p1']);
  });

  it('groups with the references that resolve and leaves the rest as display text', () => {
    const result = units([{
      source: 'a',
      resources: [direct, resource('Organization', 'o1', { name: 'General Hospital' })]
    }]);
    expect(result.map(describeUnit)).toEqual(['group:e1']);
    expect(memberIds(result[0])).toEqual(['e1', 'o1']);
  });

  it('leaves an Encounter single when none of its references resolve', () => {
    expect(units([{ source: 'a', resources: [direct] }]).map(describeUnit)).toEqual(['single:e1']);
    expect(units([{ source: 'a', resources: [encounter('e2')] }]).map(describeUnit)).toEqual(['single:e2']);
  });

  it('shows a resource referenced by several Encounters under each', () => {
    const second = encounter('e2', {
      period: { start: '2026-01-01' },
      participant: [{ individual: { reference: 'Practitioner/p1' } }]
    });
    const result = units([{
      source: 'a',
      resources: [direct, second, resource('Practitioner', 'p1', { name: [{ family: 'Who' }] })]
    }]);
    expect(result.map(describeUnit).sort()).toEqual(['group:e1', 'group:e2']);
    expect(result.map(memberIds).map(ids => ids.includes('p1'))).toEqual([true, true]);
  });

  it('follows only the Encounter\'s own references, not ones pointing back at what it references', () => {
    const result = units([{
      source: 'a',
      resources: [
        encounter('e1', { participant: [{ individual: { reference: 'Practitioner/p1' } }] }),
        resource('Practitioner', 'p1', { name: [{ family: 'Who' }] }),
        // refers to the Practitioner, but the Encounter doesn't refer to it
        resource('PractitionerRole', 'r1', { practitioner: { reference: 'Practitioner/p1' } }),
        // refers to the Organization the Encounter doesn't have at all
        resource('Location', 'l9', { managingOrganization: { reference: 'Organization/o9' } })
      ]
    }]);
    expect(result.map(describeUnit).sort()).toEqual(['group:e1', 'single:l9', 'single:r1']);
    expect(memberIds(result.find(unit => unit.kind === 'group')!)).toEqual(['e1', 'p1']);
  });

  it('includes a PractitionerRole when a participant refers straight to it', () => {
    const result = units([{
      source: 'a',
      resources: [
        encounter('e1', { participant: [{ individual: { reference: 'PractitionerRole/r1' } }] }),
        resource('PractitionerRole', 'r1', { practitioner: { reference: 'Practitioner/p1' } })
      ]
    }]);
    expect(result.map(describeUnit)).toEqual(['group:e1']);
  });

  it('does not pull in the patient or other referenced resource types', () => {
    const result = units([{
      source: 'a',
      resources: [
        encounter('e1', {
          subject: { reference: 'Patient/pt' },
          participant: [{ individual: { reference: 'Practitioner/p1' } }],
          diagnosis: [{ condition: { reference: 'Condition/c1' } }]
        }),
        resource('Patient', 'pt'),
        resource('Practitioner', 'p1', { name: [{ family: 'Who' }] }),
        resource('Condition', 'c1')
      ]
    }]);
    expect(result.map(describeUnit).sort()).toEqual(['group:e1', 'single:c1', 'single:pt']);
  });

  it('does not link to resources from another source that reuse an id', () => {
    const result = units([
      { source: 'a', resources: [direct] },
      { source: 'b', resources: [resource('Organization', 'o1', { name: 'Elsewhere' })] }
    ]);
    expect(result.map(describeUnit).sort()).toEqual(['single:e1', 'single:o1']);
  });
});
