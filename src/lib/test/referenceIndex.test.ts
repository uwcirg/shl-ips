import { describe, it, expect } from 'vitest';
import { ReferenceIndex, parseTypeId, collectReferences } from '$lib/utils/referenceIndex';

function rh(resource: Record<string, unknown>, tempId: string) {
  return { resource, tempId } as any;
}

describe('parseTypeId', () => {
  it('handles relative, absolute and versioned references', () => {
    expect(parseTypeId('Observation/1')).toEqual(['Observation', '1']);
    expect(parseTypeId('http://x.org/fhir/Observation/1')).toEqual(['Observation', '1']);
    expect(parseTypeId('Observation/1/_history/3')).toEqual(['Observation', '1']);
  });

  it('returns undefined for contained, urn and bare ids', () => {
    expect(parseTypeId('#c1')).toBeUndefined();
    expect(parseTypeId('urn:uuid:abc')).toBeUndefined();
    expect(parseTypeId('abc')).toBeUndefined();
  });
});

describe('collectReferences', () => {
  it('finds nested references and skips contained resources', () => {
    const refs = collectReferences({
      resourceType: 'DiagnosticReport',
      subject: { reference: 'Patient/p' },
      result: [{ reference: 'Observation/o1' }, { reference: 'Observation/o2' }],
      contained: [{ resourceType: 'Observation', subject: { reference: 'Patient/hidden' } }]
    } as any);
    expect(refs).toEqual(['Patient/p', 'Observation/o1', 'Observation/o2']);
  });
});

describe('ReferenceIndex', () => {
  const patient = rh({ resourceType: 'Patient', id: 'p' }, 'P');
  const obs1 = rh({ resourceType: 'Observation', id: 'o1', subject: { reference: 'Patient/p' } }, 'O1');
  const obs2 = rh({ resourceType: 'Observation', id: 'o2' }, 'O2');
  const report = rh({
    resourceType: 'DiagnosticReport',
    id: 'r',
    result: [{ reference: 'Observation/o1' }, { reference: 'Observation/o2' }]
  }, 'R');

  it('resolves references within a source and builds reverse links', () => {
    const index = new ReferenceIndex([{ source: 'a', resources: [patient, obs1, obs2, report] }]);
    expect(index.resolve('Observation/o1', 'a')?.rh.tempId).toBe('O1');
    expect(index.referencedBy('O1').map(r => r.rh.tempId).sort()).toEqual(['R']);
    expect(index.referencesOf('R', 'Observation').map(r => r.rh.tempId)).toEqual(['O1', 'O2']);
    expect(index.referencedBy('P', 'Observation').map(r => r.rh.tempId)).toEqual(['O1']);
  });

  it('does not resolve across sources that reuse the same id', () => {
    const otherObs = rh({ resourceType: 'Observation', id: 'o1', valueInteger: 9 }, 'O1b');
    const index = new ReferenceIndex([
      { source: 'a', resources: [obs1, report] },
      { source: 'b', resources: [otherObs] }
    ]);
    expect(index.resolve('Observation/o1', 'a')?.rh.tempId).toBe('O1');
    expect(index.resolve('Observation/o1', 'b')?.rh.tempId).toBe('O1b');
    expect(index.referencedBy('O1b')).toEqual([]);
  });
});
