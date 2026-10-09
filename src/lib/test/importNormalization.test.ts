import { describe, it, expect, vi } from 'vitest';
import type { Patient } from 'fhir/r4';
import {
  getEntries,
  sourceIdSystem,
  entriesToResources,
  reconcileResourcesWithOriginalEntries,
  prepareImportedResources,
  finalizeForUpload,
  stampExtractedResources,
  pruneUnlinkedEntries,
  matchBySourceIdentifier,
  diffDataset,
  type BundleEntry,
  type NormalizedIdEntry
} from '$lib/utils/importNormalization';
import type { ResourceRetrieveEvent } from '$lib/utils/types';

vi.mock('$lib/config/config', () => ({
  SOURCE_NAMESPACE: 'urn:test:source',
  PLACEHOLDER_SYSTEM: 'http://test.example.com/placeholder',
  CATEGORY_SYSTEM: 'http://test.example.com/category',
  METHOD_SYSTEM: 'http://test.example.com/method',
  SOURCE_NAME_SYSTEM: 'http://test.example.com/source-name'
}));

function patientEntry(id: string, overrides: Record<string, unknown> = {}, fullUrl?: string): NormalizedIdEntry {
  return {
    resource: { resourceType: 'Patient', id, ...overrides } as any,
    fullUrl
  };
}

function observationEntry(
  id: string | undefined,
  overrides: Record<string, unknown> = {},
  fullUrl?: string
): NormalizedIdEntry {
  return {
    resource: { resourceType: 'Observation', id, status: 'final', code: { text: 'test' }, ...overrides } as any,
    fullUrl
  };
}

function masterPatient(): Patient {
  return { resourceType: 'Patient', name: [{ given: ['Jane'], family: 'Doe' }] };
}

function importEvent(overrides: Partial<ResourceRetrieveEvent> = {}): ResourceRetrieveEvent {
  return {
    resources: undefined,
    category: 'labs',
    method: 'upload',
    source: 'source-1',
    sourceName: 'Test Source',
    ...overrides
  };
}

describe('getEntries', () => {
  it('wraps a Resource[] into BundleEntry[] with no fullUrl', () => {
    const resources = [{ resourceType: 'Patient', id: 'p1' }] as any[];

    expect(getEntries(resources)).toEqual([{ resource: resources[0] }]);
  });

  it('passes a BundleEntry[] through, dropping entries with no resource', () => {
    const entries: BundleEntry[] = [
      { resource: { resourceType: 'Patient', id: 'p1' } as any, fullUrl: 'urn:uuid:1' },
      { resource: undefined as any, fullUrl: 'urn:uuid:2' }
    ];

    expect(getEntries(entries)).toEqual([{ resource: entries[0].resource, fullUrl: 'urn:uuid:1' }]);
  });

  it('returns an empty array for empty input', () => {
    expect(getEntries([])).toEqual([]);
  });

  it('throws for input that is neither BundleEntry[] nor Resource[]', () => {
    expect(() => getEntries([{ foo: 'bar' }] as any)).toThrow(/invalid data format/);
  });
});

describe('sourceIdSystem', () => {
  it('namespaces a source and resource type', () => {
    expect(sourceIdSystem('epic', 'Observation')).toBe('urn:test:source:epic/Observation');
  });
});

describe('entriesToResources', () => {
  it('extracts the resource from each entry', () => {
    const entries = [patientEntry('p1'), observationEntry('o1')];

    expect(entriesToResources(entries)).toEqual([entries[0].resource, entries[1].resource]);
  });
});

describe('reconcileResourcesWithOriginalEntries', () => {
  it('reattaches the original fullUrl by resourceType/id', () => {
    const original = [patientEntry('p1', {}, 'urn:uuid:patient-1'), observationEntry('o1', {}, 'urn:uuid:obs-1')];
    const currentResources = entriesToResources(original);

    const reconciled = reconcileResourcesWithOriginalEntries(original, currentResources);

    expect(reconciled).toEqual(original);
  });

  it('leaves fullUrl undefined for a resource with no matching original entry', () => {
    const original = [patientEntry('p1', {}, 'urn:uuid:patient-1')];
    const newObservation = observationEntry('o1').resource;

    const reconciled = reconcileResourcesWithOriginalEntries(original, [newObservation]);

    expect(reconciled).toEqual([{ resource: newObservation, fullUrl: undefined }]);
  });

  it('drops entries for resources that were removed', () => {
    const original = [patientEntry('p1', {}, 'urn:uuid:patient-1'), observationEntry('o1', {}, 'urn:uuid:obs-1')];

    const reconciled = reconcileResourcesWithOriginalEntries(original, [original[0].resource]);

    expect(reconciled).toEqual([{ resource: original[0].resource, fullUrl: 'urn:uuid:patient-1' }]);
  });
});

describe('prepareImportedResources', () => {
  it('returns an empty array when the event has no resources', () => {
    const result = prepareImportedResources(importEvent({ resources: undefined }), masterPatient());

    expect(result).toEqual([]);
  });

  it('generates a placeholder Patient when none is present in the resources', () => {
    const event = importEvent({ resources: [], category: 'labs', method: 'upload', sourceName: 'Test Source' });

    const result = prepareImportedResources(event, masterPatient()) as unknown as NormalizedIdEntry[];

    expect(result).toHaveLength(1);
    const patient = result[0].resource as any;
    expect(patient.resourceType).toBe('Patient');
    expect(patient.name[0]).toEqual({ given: ['Jane'], family: 'Doe' });
    expect(patient.meta.source).toBe('source-1');
    expect(patient.meta.tag).toEqual(
      expect.arrayContaining([
        { system: 'http://test.example.com/placeholder', code: 'placeholder-patient' },
        { system: 'http://test.example.com/category', code: 'labs' },
        { system: 'http://test.example.com/method', code: 'upload' },
        { system: 'http://test.example.com/source-name', code: 'Test Source' }
      ])
    );
  });

  it('reuses an existing Patient resource instead of generating a placeholder', () => {
    const event = importEvent({
      resources: [patientEntry('patient-1').resource, observationEntry('obs-1').resource] as any
    });

    const result = prepareImportedResources(event, masterPatient()) as unknown as NormalizedIdEntry[];

    expect(result).toHaveLength(2);
    const patient = result.find(e => e.resource.resourceType === 'Patient')!.resource as any;
    expect(patient.id).toBe('patient-1');
    expect(patient.meta.tag).not.toContainEqual(
      expect.objectContaining({ code: 'placeholder-patient' })
    );
  });

  it('tags an existing resource with a source identifier only when it already has an id', () => {
    const withId = observationEntry('obs-1').resource;
    const withoutId = observationEntry(undefined).resource;
    const event = importEvent({ resources: [withId, withoutId] as any });

    const result = prepareImportedResources(event, masterPatient()) as unknown as NormalizedIdEntry[];

    const taggedEntry = result.find(e => e.resource.id === 'obs-1')!.resource as any;
    expect(taggedEntry.identifier).toEqual([
      { system: 'urn:test:source:source-1/Observation', value: 'obs-1' }
    ]);

    const untaggedEntry = result.find(
      e => e.resource.resourceType === 'Observation' && e.resource.id !== 'obs-1'
    )!.resource as any;
    expect(untaggedEntry.identifier).toBeUndefined();
    expect(untaggedEntry.id).toEqual(expect.any(String));
  });
});

describe('finalizeForUpload', () => {
  it('assigns a urn:uuid: fullUrl to every entry', () => {
    const entries = [patientEntry('patient-1'), observationEntry('obs-1')];

    const result = finalizeForUpload(entries);

    for (const entry of result) {
      expect(entry.fullUrl).toMatch(/^urn:uuid:[0-9a-f-]+$/);
    }
  });

  it('rewrites a resourceType/id reference to the resolved fullUrl', () => {
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1'),
      observationEntry('obs-2', { hasMember: [{ reference: 'Observation/obs-1' }] })
    ];

    const result = finalizeForUpload(entries);

    const obs1 = result.find(e => (e.resource as any).id === 'obs-1')!;
    const obs2 = result.find(e => (e.resource as any).id === 'obs-2')!;
    expect((obs2.resource as any).hasMember[0].reference).toBe(obs1.fullUrl);
  });

  it('resolves a reference by its original fullUrl', () => {
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1', {}, 'urn:uuid:original-obs-1'),
      observationEntry('obs-2', { hasMember: [{ reference: 'urn:uuid:original-obs-1' }] })
    ];

    const result = finalizeForUpload(entries);

    const obs1 = result.find(e => (e.resource as any).id === 'obs-1')!;
    const obs2 = result.find(e => (e.resource as any).id === 'obs-2')!;
    expect((obs2.resource as any).hasMember[0].reference).toBe(obs1.fullUrl);
  });

  it('drops an unresolvable urn: reference rather than uploading a broken one', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1', { hasMember: [{ reference: 'urn:uuid:not-in-bundle' }] })
    ];

    const result = finalizeForUpload(entries);

    const obs1 = result.find(e => (e.resource as any).id === 'obs-1')!;
    expect((obs1.resource as any).hasMember).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('drops an unresolvable relative reference, removing the emptied element', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1', { focus: [{ reference: 'ObservationDefinition/missing' }] })
    ];

    const result = finalizeForUpload(entries);

    const obs1 = result.find(e => (e.resource as any).id === 'obs-1')!;
    expect((obs1.resource as any).focus).toBeUndefined();
    warnSpy.mockRestore();
  });

  it('keeps the display of a dropped reference', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1', { focus: [{ reference: 'ObservationDefinition/missing', display: 'Panel definition' }] })
    ];

    const result = finalizeForUpload(entries);

    const obs1 = result.find(e => (e.resource as any).id === 'obs-1')!;
    expect((obs1.resource as any).focus).toEqual([{ display: 'Panel definition' }]);
    warnSpy.mockRestore();
  });

  it('handles several dropped references in one array without disturbing resolvable ones', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1'),
      observationEntry('obs-2', {
        hasMember: [
          { reference: 'Observation/missing-a' },
          { reference: 'Observation/obs-1' },
          { reference: 'Observation/missing-b' }
        ]
      })
    ];

    const result = finalizeForUpload(entries);

    const obs1 = result.find(e => (e.resource as any).id === 'obs-1')!;
    const obs2 = result.find(e => (e.resource as any).id === 'obs-2')!;
    expect((obs2.resource as any).hasMember).toEqual([{ reference: obs1.fullUrl }]);
    warnSpy.mockRestore();
  });

  it('leaves contained (#) references untouched', () => {
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1', { focus: [{ reference: '#contained-1' }] })
    ];

    const result = finalizeForUpload(entries);

    const obs1 = result.find(e => (e.resource as any).id === 'obs-1')!;
    expect((obs1.resource as any).focus).toEqual([{ reference: '#contained-1' }]);
  });

  it('forces subject/patient-linked fields to point at the resolved Patient', () => {
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1', { subject: { reference: 'Patient/someone-else' } })
    ];

    const result = finalizeForUpload(entries);

    const patient = result.find(e => (e.resource as any).resourceType === 'Patient')!;
    const obs1 = result.find(e => (e.resource as any).id === 'obs-1')!;
    expect((obs1.resource as any).subject.reference).toBe(patient.fullUrl);
  });

  it('throws when no Patient resource is present', () => {
    const entries = [observationEntry('obs-1')];

    expect(() => finalizeForUpload(entries)).toThrow(/no Patient resource found/);
  });

  it('throws a descriptive error when an entry is missing an id', () => {
    const entries = [patientEntry('patient-1'), observationEntry(undefined)];

    expect(() => finalizeForUpload(entries)).toThrow(/missing an id/);
  });
});

const srcId = (resourceType: string, value: string) => ({ system: `urn:test:source:source-1/${resourceType}`, value });
const obs = (id: string, identifier?: any[]) => ({ resourceType: 'Observation', id, identifier } as any);

describe('stampExtractedResources', () => {
  it('gives extracted resources a deterministic source identifier per type and position', () => {
    const qr = { resourceType: 'QuestionnaireResponse', id: 'qr-1' } as any;
    const run = () => stampExtractedResources('source-1', qr, [obs('a'), obs('b'), { resourceType: 'Condition', id: 'c' } as any]);

    const first = run();
    const second = run();

    expect(first[0].identifier).toEqual([srcId('Observation', 'qr-1:Observation:0')]);
    expect(first[1].identifier).toEqual([srcId('Observation', 'qr-1:Observation:1')]);
    expect(first[2].identifier).toEqual([srcId('Condition', 'qr-1:Condition:0')]);
    expect(second.map((r: any) => r.identifier)).toEqual(first.map((r: any) => r.identifier));
  });

  it("derives the value from the QuestionnaireResponse's own source identifier when it has one", () => {
    const qr = { resourceType: 'QuestionnaireResponse', id: 'random-id', identifier: srcId('QuestionnaireResponse', 'original-qr') } as any;

    const [result] = stampExtractedResources('source-1', qr, [obs('a')]);

    expect(result.identifier).toEqual([srcId('Observation', 'original-qr:Observation:0')]);
  });

  it('keeps other identifiers and does not add a second source identifier', () => {
    const qr = { resourceType: 'QuestionnaireResponse', id: 'qr-1' } as any;
    const other = { system: 'urn:other', value: 'x' };
    const existing = srcId('Observation', 'already');

    const [withOther, withSource] = stampExtractedResources('source-1', qr, [obs('a', [other]), obs('b', [existing])]);

    expect((withOther as any).identifier).toEqual([other, srcId('Observation', 'qr-1:Observation:0')]);
    expect((withSource as any).identifier).toEqual([existing]);
  });
});

describe('diffDataset', () => {
  const matcher = matchBySourceIdentifier('source-1');

  it('splits resources into added, updated, and removed by source identifier', () => {
    const incoming = [
      { ...obs('new-1', [srcId('Observation', 'a')]), valueString: 'changed' },
      obs('new-2', [srcId('Observation', 'b')])
    ];
    const existing = [obs('old-1', [srcId('Observation', 'a')]), obs('old-2', [srcId('Observation', 'gone')])];

    const diff = diffDataset(incoming, existing, matcher);

    expect(diff.added).toEqual([incoming[1]]);
    expect(diff.updated).toEqual([{ incoming: incoming[0], existing: existing[0] }]);
    expect(diff.unchanged).toEqual([]);
    expect(diff.removed).toEqual([existing[1]]);
  });

  it('does not match the same source id across different resource types', () => {
    const incoming = [{ resourceType: 'Condition', id: 'c', identifier: [srcId('Condition', 'a')] } as any];
    const existing = [obs('o', [srcId('Observation', 'a')])];

    const diff = diffDataset(incoming, existing, matcher);

    expect(diff.updated).toEqual([]);
    expect(diff.unchanged).toEqual([]);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(1);
  });

  it('treats resources without a source identifier as unmatched', () => {
    const diff = diffDataset([obs('a')], [obs('b')], matcher);

    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(1);
    expect(diff.updated).toEqual([]);
  });

  it('matches each existing resource at most once', () => {
    const incoming = [obs('n1', [srcId('Observation', 'a')]), obs('n2', [srcId('Observation', 'a')])];
    const existing = [obs('o1', [srcId('Observation', 'a')])];

    const diff = diffDataset(incoming, existing, matcher);

    expect(diff.unchanged).toHaveLength(1);
    expect(diff.added).toEqual([incoming[1]]);
  });

  describe('patients', () => {
    const placeholderTag = { system: 'http://test.example.com/placeholder', code: 'placeholder-patient' };
    const patient = (id: string, overrides: Record<string, unknown> = {}) =>
      ({ resourceType: 'Patient', id, ...overrides }) as any;
    const jane = {
      name: [{ family: 'Doe', given: ['Jane'] }],
      birthDate: '1980-01-02',
      identifier: [srcId('Patient', 'src-pat'), { system: 'urn:mrn', value: '123' }]
    };

    it('never compares placeholder patients', () => {
      const placeholder = (id: string) => patient(id, { meta: { tag: [placeholderTag] }, name: [{ family: 'Other' }] });

      const diff = diffDataset([placeholder('p1')], [patient('p2', jane)], matcher);
      const reverse = diffDataset([patient('p1', jane)], [placeholder('p2')], matcher);

      expect(diff).toEqual({ added: [], updated: [], unchanged: [], removed: [] });
      expect(reverse).toEqual({ added: [], updated: [], unchanged: [], removed: [] });
    });

    it('reports an unchanged patient as unchanged, with no mismatch', () => {
      const incoming = patient('new', { ...jane, meta: { lastUpdated: 'x' } });
      const existing = patient('old', jane);

      const diff = diffDataset([incoming], [existing], matcher);

      expect(diff.unchanged).toEqual([{ incoming, existing }]);
      expect(diff.updated).toEqual([]);
      expect(diff.patientMismatch).toBeUndefined();
    });

    it('reports address and phone changes as an update without flagging a mismatch', () => {
      const incoming = patient('new', { ...jane, telecom: [{ system: 'phone', value: '555-0100' }], address: [{ city: 'Seattle' }] });
      const existing = patient('old', { ...jane, telecom: [{ system: 'phone', value: '555-0199' }], address: [{ city: 'Tacoma' }] });

      const diff = diffDataset([incoming], [existing], matcher);

      expect(diff.updated).toEqual([{ incoming, existing }]);
      expect(diff.patientMismatch).toBeUndefined();
    });

    it('flags a different name, birth date, or identifier', () => {
      const mismatch = (overrides: Record<string, unknown>) =>
        diffDataset([patient('new', { ...jane, ...overrides })], [patient('old', jane)], matcher);

      expect(mismatch({ name: [{ family: 'Smith', given: ['Jane'] }] }).patientMismatch).toEqual({ fields: ['name'] });
      expect(mismatch({ birthDate: '1999-09-09' }).patientMismatch).toEqual({ fields: ['birthDate'] });
      expect(mismatch({ identifier: [srcId('Patient', 'src-pat'), { system: 'urn:mrn', value: '999' }] }).patientMismatch)
        .toEqual({ fields: ['identifier'] });
      expect(mismatch({ name: [{ family: 'Smith' }], birthDate: '1999-09-09' }).patientMismatch)
        .toEqual({ fields: ['name', 'birthDate'] });
      expect(mismatch({ birthDate: '1999-09-09' }).updated).toHaveLength(1);
    });

    it('does not flag a field that is only present on one side, or that overlaps', () => {
      const incoming = patient('new', {
        name: [{ family: 'Doe', given: ['JANE', 'Q'] }, { family: 'Roe' }],
        identifier: [{ system: 'urn:mrn', value: '123' }, { system: 'urn:other', value: '7' }]
      });

      expect(diffDataset([incoming], [patient('old', jane)], matcher).patientMismatch).toBeUndefined();
      expect(diffDataset([patient('new', { name: jane.name })], [patient('old', { birthDate: '1980-01-02' })], matcher).patientMismatch)
        .toBeUndefined();
    });

    it('does not treat the normalization-added source identifier as an MRN', () => {
      const incoming = patient('new', { ...jane, identifier: [srcId('Patient', 'a')] });
      const existing = patient('old', { ...jane, identifier: [srcId('Patient', 'b')] });

      expect(diffDataset([incoming], [existing], matcher).patientMismatch).toBeUndefined();
    });
  });

  it('accepts any matcher', () => {
    const incoming = [obs('a'), obs('b')];
    const existing = [obs('x')];

    const diff = diffDataset(incoming, existing, (inc, ex) => [[inc[0], ex[0]]]);

    expect(diff.unchanged).toEqual([{ incoming: incoming[0], existing: existing[0] }]);
    expect(diff.added).toEqual([incoming[1]]);
    expect(diff.removed).toEqual([]);
  });

  it('ignores system-specific fields when deciding whether a match changed', () => {
    const base = { code: { text: 'Weight' }, valueQuantity: { value: 70, unit: 'kg' } };
    const incoming = [{
      ...obs('new', [srcId('Observation', 'a')]), ...base,
      subject: { reference: 'urn:uuid:123', display: 'Jane' },
      meta: { lastUpdated: '2026-01-01T00:00:00Z' }, text: { status: 'generated', div: '<div>new</div>' }
    }];
    const existing = [{
      ...obs('old', [srcId('Observation', 'a'), { system: 'urn:server', value: 'x' }]),
      valueQuantity: { unit: 'kg', value: 70 }, code: { text: 'Weight' },
      subject: { reference: 'Patient/42', display: 'Jane' },
      meta: { versionId: '3' }
    }];

    const diff = diffDataset(incoming, existing, matcher);

    expect(diff.unchanged).toHaveLength(1);
    expect(diff.updated).toEqual([]);
  });

  it('treats a changed value, display, or nested text as an update', () => {
    const make = (extra: any) => ({ ...obs('x', [srcId('Observation', 'a')]), code: { text: 'Weight' }, ...extra });
    const existing = [make({ valueString: 'a', performer: [{ display: 'Dr. Jane' }] })];

    expect(diffDataset([make({ valueString: 'b', performer: [{ display: 'Dr. Jane' }] })], existing, matcher).updated).toHaveLength(1);
    expect(diffDataset([make({ valueString: 'a', performer: [{ display: 'Dr. Janet' }] })], existing, matcher).updated).toHaveLength(1);
    expect(diffDataset([make({ valueString: 'a', performer: [{ display: 'Dr. Jane' }], code: { text: 'Height' } })], existing, matcher).updated).toHaveLength(1);
  });

  it('ignores a changed patient-linked field, since upload replaces it with a bare reference to the Patient', () => {
    const make = (subject: any) => ({ ...obs('x', [srcId('Observation', 'a')]), valueString: 'a', subject });

    const diff = diffDataset([make({ reference: 'Patient/1', display: 'Jane' })], [make({ reference: 'Patient/2' })], matcher);

    expect(diff.unchanged).toHaveLength(1);
    expect(diff.updated).toEqual([]);
  });
});

describe('pruneUnlinkedEntries', () => {
  const org = (id: string, fullUrl?: string): NormalizedIdEntry =>
    ({ resource: { resourceType: 'Organization', id } as any, fullUrl });
  const ids = (entries: NormalizedIdEntry[]) => entries.map(e => (e.resource as any).id);

  it('drops a resource that nothing linked to the Patient refers to', () => {
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1', { subject: { reference: 'Patient/patient-1' } }),
      org('orphan')
    ];

    expect(ids(pruneUnlinkedEntries(entries))).toEqual(['patient-1', 'obs-1']);
  });

  it('keeps resources referenced, directly or indirectly, by a patient-linked resource', () => {
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1', { subject: { reference: 'Patient/patient-1' }, performer: [{ reference: 'Practitioner/pr-1' }] }),
      { resource: { resourceType: 'Practitioner', id: 'pr-1', qualification: [{ issuer: { reference: 'Organization/org-1' } }] } as any },
      org('org-1'),
      org('orphan')
    ];

    expect(ids(pruneUnlinkedEntries(entries))).toEqual(['patient-1', 'obs-1', 'pr-1', 'org-1']);
  });

  it('resolves references by the original fullUrl', () => {
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1', { subject: { reference: 'Patient/patient-1' }, performer: [{ reference: 'urn:uuid:org-a' }] }),
      org('org-1', 'urn:uuid:org-a'),
      org('org-2', 'urn:uuid:org-b')
    ];

    expect(ids(pruneUnlinkedEntries(entries))).toEqual(['patient-1', 'obs-1', 'org-1']);
  });

  it('does not keep a resource that is only referenced by another unlinked resource', () => {
    const entries = [
      patientEntry('patient-1'),
      { resource: { resourceType: 'Practitioner', id: 'pr-1', qualification: [{ issuer: { reference: 'Organization/org-1' } }] } as any },
      org('org-1')
    ];

    expect(ids(pruneUnlinkedEntries(entries))).toEqual(['patient-1']);
  });

  it('handles reference cycles', () => {
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1', { subject: { reference: 'Patient/patient-1' }, hasMember: [{ reference: 'Observation/obs-2' }] }),
      { resource: { resourceType: 'Observation', id: 'obs-2', status: 'final', code: { text: 'x' }, hasMember: [{ reference: 'Observation/obs-1' }] } as any }
    ];

    expect(ids(pruneUnlinkedEntries(entries))).toEqual(['patient-1', 'obs-1', 'obs-2']);
  });
});
