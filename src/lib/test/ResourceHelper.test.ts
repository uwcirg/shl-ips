import { describe, it, expect } from 'vitest';
import { ResourceHelper } from '$lib/utils/ResourceHelper';

describe('ResourceHelper.core', () => {
  it('drops top-level id, meta, and narrative text', () => {
    const core = ResourceHelper.core({
      resourceType: 'Observation',
      id: 'x',
      meta: { versionId: '1' },
      text: { status: 'generated', div: '<div/>' },
      status: 'final'
    } as any);

    expect(core).toEqual({ resourceType: 'Observation', status: 'final' });
  });

  it('keeps nested text, since it is content (e.g. CodeableConcept.text)', () => {
    const core = ResourceHelper.core({ resourceType: 'Observation', code: { text: 'Weight' } } as any);

    expect(core.code).toEqual({ text: 'Weight' });
  });

  it('drops references and identifiers at any depth, and the elements they leave empty', () => {
    const core = ResourceHelper.core({
      resourceType: 'Observation',
      identifier: [{ system: 's', value: 'v' }],
      subject: { reference: 'Patient/1' },
      performer: [{ reference: 'Practitioner/1', identifier: { value: 'p' }, display: 'Dr. A' }],
      hasMember: [{ reference: 'Observation/2' }]
    } as any);

    expect(core).toEqual({ resourceType: 'Observation', performer: [{ display: 'Dr. A' }] });
  });

  it('drops nested element ids', () => {
    const core = ResourceHelper.core({ resourceType: 'Observation', component: [{ id: 'c1', valueString: 'a' }] } as any);

    expect(core.component).toEqual([{ valueString: 'a' }]);
  });
});

describe('ResourceHelper.hasSameCore (imported vs stored copy)', () => {
  const imported = {
    resourceType: 'Condition',
    id: '14604',
    meta: { versionId: '1', lastUpdated: '2023-09-09T22:01:19.132+00:00' },
    extension: [{ url: 'http://hl7.org/fhir/StructureDefinition/narrativeLink', valueUrl: 'urn:uuid:abc#Condition-1' }],
    clinicalStatus: { coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }] },
    code: { coding: [{ system: 'http://snomed.info/sct', code: '42343007', display: 'Congestive heart failure' }], text: 'Congestive heart failure' },
    subject: { reference: 'Patient/14599', display: 'Maria SEATTLE Gravitate' },
    onsetDateTime: '2015'
  } as any;
  const stored = {
    resourceType: 'Condition',
    id: '9feb9dc6',
    identifier: [{ system: 'urn:source/Condition', value: '14604' }],
    meta: { lastUpdated: '2026-10-08T18:41:51.037+00:00', security: [{ code: 'x' }], source: '#abc', versionId: '1' },
    clinicalStatus: { coding: [{ code: 'active', system: 'http://terminology.hl7.org/CodeSystem/condition-clinical' }] },
    code: { text: 'Congestive heart failure', coding: [{ code: '42343007', display: 'Congestive heart failure', system: 'http://snomed.info/sct' }] },
    onsetDateTime: '2015',
    subject: { reference: 'Patient/dc3b7173' }
  } as any;

  it('treats an imported resource and its stored copy as the same', () => {
    expect(ResourceHelper.hasSameCore(imported, stored)).toBe(true);
  });

  it('still sees other extensions as content', () => {
    const withExtension = { ...imported, extension: [...imported.extension, { url: 'urn:other', valueString: 'x' }] };

    expect(ResourceHelper.hasSameCore(withExtension, stored)).toBe(false);
  });
});

describe('ResourceHelper.hasSameCore', () => {
  it('ignores key order and system-specific fields', () => {
    const a = { resourceType: 'Observation', id: '1', status: 'final', code: { text: 'x' } } as any;
    const b = { code: { text: 'x' }, status: 'final', meta: { versionId: '2' }, id: '2', resourceType: 'Observation' } as any;

    expect(ResourceHelper.hasSameCore(a, b)).toBe(true);
  });

  it('detects a content change', () => {
    const a = { resourceType: 'Observation', status: 'final' } as any;
    const b = { resourceType: 'Observation', status: 'amended' } as any;

    expect(ResourceHelper.hasSameCore(a, b)).toBe(false);
  });
});
