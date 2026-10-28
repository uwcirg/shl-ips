import { describe, it, expect } from 'vitest';
import { ResourceHelper } from '$lib/utils/ResourceHelper';
import { ReferenceIndex } from '$lib/utils/referenceIndex';
import {
  buildDisplayUnits,
  deviceUseStatementGrouper,
  type DisplayUnit,
  type GroupUnit
} from '$lib/stores/displayUnits';
import type { CategorizedResource } from '$lib/stores/categorizedResources';

const device = (id: string, extra: Record<string, unknown> = {}) => ({ resourceType: 'Device', id, ...extra });
const statement = (id: string, deviceReference?: string, extra: Record<string, unknown> = {}) => ({
  resourceType: 'DeviceUseStatement',
  id,
  status: 'active',
  subject: { reference: 'Patient/p' },
  device: deviceReference ? { reference: deviceReference, display: 'Pacemaker' } : { display: 'Pacemaker' },
  ...extra
});

function units(
  inputs: Array<{ source: string, resources: Array<Record<string, any>> }>
): DisplayUnit[] {
  const grouped = inputs.map(({ source, resources }) => ({
    source,
    resources: resources.map(resource => new ResourceHelper(resource as any))
  }));
  const items: CategorizedResource[] = grouped.flatMap(({ source, resources }) =>
    resources.map(rh => ({ source, rh, renderInfo: { mode: 'raw' as const } }))
  );
  return buildDisplayUnits(items, new ReferenceIndex(grouped), [deviceUseStatementGrouper]);
}

const describeUnit = (unit: DisplayUnit) =>
  unit.kind === 'group' ? `group:${unit.anchor?.rh.resource.id}` : `single:${unit.item.rh.resource.id}`;

describe('deviceUseStatementGrouper', () => {
  it('groups a statement with its device, anchored on the statement', () => {
    const result = units([{ source: 'a', resources: [statement('s1', 'Device/d1'), device('d1')] }]);
    expect(result.map(describeUnit)).toEqual(['group:s1']);
    const group = result[0] as GroupUnit;
    expect(group.groupType).toBe('deviceUseStatement');
    expect(group.members.map(m => m.rh.resource.id).sort()).toEqual(['d1', 's1']);
  });

  it('shows a device shared by several statements under each of them', () => {
    const result = units([{
      source: 'a',
      resources: [
        statement('s1', 'Device/d1', { status: 'stopped' }),
        statement('s2', 'Device/d1'),
        device('d1')
      ]
    }]);
    expect(result.map(describeUnit).sort()).toEqual(['group:s1', 'group:s2']);
  });

  it('leaves a statement single when its device cannot be resolved', () => {
    const missing = units([{ source: 'a', resources: [statement('s1', 'Device/nope')] }]);
    expect(missing.map(describeUnit)).toEqual(['single:s1']);
    const noReference = units([{ source: 'a', resources: [statement('s1')] }]);
    expect(noReference.map(describeUnit)).toEqual(['single:s1']);
    const contained = units([{ source: 'a', resources: [statement('s1', '#d1', { contained: [device('d1')] })] }]);
    expect(contained.map(describeUnit)).toEqual(['single:s1']);
  });

  it('leaves a device no statement refers to single', () => {
    const result = units([{ source: 'a', resources: [device('d1'), statement('s1', 'Device/d2'), device('d2')] }]);
    expect(result.map(describeUnit).sort()).toEqual(['group:s1', 'single:d1']);
  });

  it('does not link a statement to a device from another source with the same id', () => {
    const result = units([
      { source: 'a', resources: [statement('s1', 'Device/d1')] },
      { source: 'b', resources: [device('d1', { manufacturer: 'Other' })] }
    ]);
    expect(result.map(describeUnit).sort()).toEqual(['single:d1', 'single:s1']);
  });
});
