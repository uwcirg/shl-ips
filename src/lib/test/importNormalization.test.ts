import { describe, it, expect, vi } from 'vitest';
import type { Patient } from 'fhir/r4';
import {
  getEntries,
  sourceIdSystem,
  entriesToResources,
  reconcileResourcesWithOriginalEntries,
  prepareImportedResources,
  finalizeForUpload,
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
    expect((obs1.resource as any).hasMember[0].reference).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('leaves an unresolvable non-urn reference untouched', () => {
    const entries = [
      patientEntry('patient-1'),
      observationEntry('obs-1', { hasMember: [{ reference: 'Practitioner/does-not-exist' }] })
    ];

    const result = finalizeForUpload(entries);

    const obs1 = result.find(e => (e.resource as any).id === 'obs-1')!;
    expect((obs1.resource as any).hasMember[0].reference).toBe('Practitioner/does-not-exist');
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
