import { describe, expect, it, vi } from 'vitest';
import { ResourceCollection } from '$lib/utils/ResourceCollection';

const { CATEGORY_SYSTEM, METHOD_SYSTEM, SOURCE_NAME_SYSTEM, PLACEHOLDER_SYSTEM } = vi.hoisted(() => ({
  CATEGORY_SYSTEM: 'http://test.example.com/category',
  METHOD_SYSTEM: 'http://test.example.com/method',
  SOURCE_NAME_SYSTEM: 'http://test.example.com/source-name',
  PLACEHOLDER_SYSTEM: 'http://test.example.com/placeholder'
}));

vi.mock('$lib/config/config', () => ({
  CATEGORY_SYSTEM,
  METHOD_SYSTEM,
  SOURCE_NAME_SYSTEM,
  PLACEHOLDER_SYSTEM,
  IDENTIFIER_SYSTEM: 'http://keycloak.example.com',
  INTERMEDIATE_FHIR_SERVER_BASE: 'https://fhir.example.com'
}));

import { buildRecordContext, compactResource } from '$lib/utils/recordContext';

function patient(placeholder: boolean) {
  return {
    resourceType: 'Patient',
    id: placeholder ? 'placeholder' : 'patient-1',
    name: [{ family: 'Example', given: ['Pat'] }],
    meta: {
      source: 'test-clinic',
      tag: [
        { system: CATEGORY_SYSTEM, code: 'provider-health-record' },
        { system: METHOD_SYSTEM, code: 'provider-health-record-sof' },
        { system: SOURCE_NAME_SYSTEM, code: 'Test Clinic' },
        ...(placeholder ? [{ system: PLACEHOLDER_SYSTEM, code: 'placeholder-patient' }] : [])
      ]
    }
  };
}

function observation(id: string, text = 'Blood pressure') {
  return {
    resourceType: 'Observation',
    id,
    meta: { lastUpdated: '2024-01-01' },
    text: { status: 'generated', div: '<div>narrative</div>' },
    identifier: [{ value: 'abc' }],
    extension: [{ url: 'http://example.com/ext', valueString: 'noise' }],
    status: 'final',
    code: { text, coding: [{ system: 'http://loinc.org', code: '85354-9', extension: [] }] },
    subject: { reference: 'Patient/patient-1' },
    note: []
  };
}

describe('compactResource', () => {
  it('drops narrative, meta, identifiers, extensions and empty values but keeps ids and references', () => {
    expect(compactResource(observation('obs-1') as any)).toEqual({
      resourceType: 'Observation',
      id: 'obs-1',
      status: 'final',
      code: { text: 'Blood pressure', coding: [{ system: 'http://loinc.org', code: '85354-9' }] },
      subject: { reference: 'Patient/patient-1' }
    });
  });
});

describe('buildRecordContext', () => {
  it('groups resources by type, patient first, and leaves out the placeholder patient', () => {
    const rc = new ResourceCollection([patient(true), observation('obs-1')] as any);
    const real = new ResourceCollection([patient(false), observation('obs-2')] as any);

    const context = buildRecordContext([rc, real]);

    const lines = context.text.split('\n');
    expect(lines[0]).toBe('## Patient');
    expect(lines.filter((l) => l.includes('"resourceType":"Patient"'))).toHaveLength(1);
    expect(context.text).not.toContain('"id":"placeholder"');
    expect(lines).toContain('## Observation');
    expect(context.count).toBe(3);
    expect(context.omitted).toBe(0);
    expect(context.text).not.toContain('narrative');
  });

  it('skips resources the user has excluded', () => {
    const rc = new ResourceCollection([patient(true), observation('obs-1'), observation('obs-2')] as any);
    rc.resources.update((map: any) => {
      for (const rh of Object.values(map) as any[]) {
        if (rh.resource.id === 'obs-2') rh.include = false;
      }
      return map;
    });

    const context = buildRecordContext([rc]);

    expect(context.text).toContain('"id":"obs-1"');
    expect(context.text).not.toContain('"id":"obs-2"');
  });

  it('stops at the size budget and reports what was left out', () => {
    // Distinct content per resource: ResourceCollection dedupes resources that differ only by id
    const rc = new ResourceCollection([
      patient(true),
      ...Array.from({ length: 10 }, (_, i) => observation(`obs-${i}`, `Test ${i}`))
    ] as any);
    // Budget for the header plus exactly three resource lines, as actually serialized
    const full = buildRecordContext([rc]).text.split('\n');
    expect(full).toHaveLength(11);
    const budget = full.slice(0, 4).reduce((sum, line) => sum + line.length + 1, 0);

    const context = buildRecordContext([rc], budget);

    expect(context.count).toBe(3);
    expect(context.omitted).toBe(7);
    expect(context.text.length).toBeLessThanOrEqual(budget);
  });

  it('returns an empty record when nothing is loaded', () => {
    expect(buildRecordContext([])).toEqual({ text: '', count: 0, omitted: 0 });
  });
});
