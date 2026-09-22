import { describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { IPSResourceCollection } from '$lib/utils/IPSResourceCollection';
import { METHODS } from '$lib/config/tags';

// vi.mock factories are hoisted above this file's own top-level const declarations, so
// anything they reference must come from vi.hoisted() rather than a plain const, or the
// factory sees it in its temporal dead zone ("Cannot access '...' before initialization").
const { CATEGORY_SYSTEM, METHOD_SYSTEM, SOURCE_NAME_SYSTEM, PLACEHOLDER_SYSTEM, IDENTIFIER_SYSTEM } = vi.hoisted(
  () => ({
    CATEGORY_SYSTEM: 'http://test.example.com/category',
    METHOD_SYSTEM: 'http://test.example.com/method',
    SOURCE_NAME_SYSTEM: 'http://test.example.com/source-name',
    PLACEHOLDER_SYSTEM: 'http://test.example.com/placeholder',
    IDENTIFIER_SYSTEM: 'http://keycloak.example.com'
  })
);

vi.mock('$lib/config/config', () => ({
  CATEGORY_SYSTEM,
  METHOD_SYSTEM,
  SOURCE_NAME_SYSTEM,
  PLACEHOLDER_SYSTEM,
  IDENTIFIER_SYSTEM,
  INTERMEDIATE_FHIR_SERVER_BASE: 'https://fhir.example.com'
}));

function patient(id: string, overrides: Record<string, unknown> = {}): any {
  return { resourceType: 'Patient', id, ...overrides };
}

function observation(id: string, overrides: Record<string, unknown> = {}): any {
  return { resourceType: 'Observation', id, status: 'final', code: { text: 'test' }, ...overrides };
}

function ipsBundle(sections: any[] = []): any {
  return {
    resourceType: 'Bundle',
    type: 'document',
    entry: [
      {
        resource: {
          resourceType: 'Composition',
          type: { coding: [{ system: 'http://loinc.org', code: '60591-5' }] },
          section: sections
        }
      }
    ]
  };
}

describe('IPSResourceCollection', () => {
  describe('resourcesByType', () => {
    it('groups added resources by resourceType', () => {
      const collection = new IPSResourceCollection();
      collection.addResource(patient('p1'));
      collection.addResource(observation('o1', { note: [{ text: 'first' }] }));
      collection.addResource(observation('o2', { note: [{ text: 'second' }] }));

      const byType = get(collection.resourcesByType);

      expect(Object.keys(byType).sort()).toEqual(['Observation', 'Patient']);
      expect(Object.keys(byType.Observation)).toHaveLength(2);
      expect(Object.keys(byType.Patient)).toHaveLength(1);
    });
  });

  describe('addResource', () => {
    it('strips an identifier whose system matches IDENTIFIER_SYSTEM, keeping others', () => {
      const collection = new IPSResourceCollection();
      const rh = collection.addResource(
        observation('o1', {
          identifier: [
            { system: IDENTIFIER_SYSTEM, value: 'internal-id' },
            { system: 'http://example.org/other', value: 'keep-me' }
          ]
        })
      );

      expect((rh.resource as any).identifier).toEqual([{ system: 'http://example.org/other', value: 'keep-me' }]);
    });

    it('deletes the identifier field entirely when stripping empties it', () => {
      const collection = new IPSResourceCollection();
      const rh = collection.addResource(
        observation('o1', { identifier: [{ system: IDENTIFIER_SYSTEM, value: 'internal-id' }] })
      );

      expect((rh.resource as any).identifier).toBeUndefined();
    });

    it('leaves a resource with no identifier field untouched', () => {
      const collection = new IPSResourceCollection();
      const rh = collection.addResource(observation('o1'));

      expect((rh.resource as any).identifier).toBeUndefined();
    });
  });

  describe('addResources', () => {
    it('filters out a disallowed resource type without adding it', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const collection = new IPSResourceCollection();

      const result = collection.addResources([
        observation('o1'),
        { resourceType: 'Bundle', id: 'b1' } as any,
        { resourceType: 'Foo', id: 'f1' } as any
      ]);

      expect(result).toHaveLength(1);
      expect((result[0].resource as any).resourceType).toBe('Observation');
      // Only the fully-unrecognized type logs via the final `else` branch of
      // _validateResource; "Bundle" has its own dedicated (silent) rejection branch.
      expect(logSpy).toHaveBeenCalledWith('skipping Foo');
      expect(logSpy).not.toHaveBeenCalledWith('skipping Bundle');
      expect(warnSpy).toHaveBeenCalledTimes(2);

      warnSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('drops a placeholder Patient from the resources it actually adds', () => {
      const collection = new IPSResourceCollection();
      const placeholderPatient = patient('placeholder-1', {
        meta: { tag: [{ system: PLACEHOLDER_SYSTEM, code: 'placeholder-patient' }] }
      });

      const result = collection.addResources([placeholderPatient, observation('o1')]);

      expect(result).toHaveLength(1);
      expect((result[0].resource as any).resourceType).toBe('Observation');
      expect(Object.keys(get(collection.resources))).toHaveLength(1);
    });
  });

  describe('getSelectedIPSResources', () => {
    it('returns only resources whose include flag is true', () => {
      const collection = new IPSResourceCollection();
      collection.addResource(patient('p1'));
      const obsRH = collection.addResource(observation('o1'));
      obsRH.include = false;
      collection.updateResource(obsRH);

      const selected = collection.getSelectedIPSResources();

      expect(selected.map(rh => (rh.resource as any).resourceType)).toEqual(['Patient']);
    });
  });

  describe('extendIPS', () => {
    it('throws when the given bundle is not a valid IPS bundle', () => {
      const collection = new IPSResourceCollection();

      expect(() => collection.extendIPS({ resourceType: 'Bundle', type: 'collection' } as any)).toThrow(
        'Bundle is not an IPS bundle'
      );
    });

    it('adds a Patient Story section built from resources tagged for that method', () => {
      const collection = new IPSResourceCollection();
      const storyPatient = patient('placeholder-1', {
        meta: {
          tag: [
            { system: METHOD_SYSTEM, code: METHODS.PATIENT_STORY_FORM },
            { system: PLACEHOLDER_SYSTEM, code: 'placeholder-patient' }
          ]
        }
      });
      const storyObservation = observation('story-1', { valueString: 'This is my story.' });

      const added = collection.addResources([storyPatient, storyObservation]);
      // The placeholder patient is used only to pick the section extender; it's not added itself.
      expect(added).toHaveLength(1);

      const ips = ipsBundle();
      const result = collection.extendIPS(ips);

      const composition = result.entry[0].resource;
      expect(composition.section).toHaveLength(1);
      expect(composition.section[0].title).toBe('Patient Story');
      expect(composition.section[0].extension[0].valueString).toBe('This is my story.');
      expect(composition.section[0].text.div).toContain('<p>This is my story.</p>');
    });
  });

  describe('clear', () => {
    it('resets resources, selected patient, and section-extender registrations', () => {
      const collection = new IPSResourceCollection();
      const storyPatient = patient('placeholder-1', {
        meta: {
          tag: [
            { system: METHOD_SYSTEM, code: METHODS.PATIENT_STORY_FORM },
            { system: PLACEHOLDER_SYSTEM, code: 'placeholder-patient' }
          ]
        }
      });
      collection.addResources([storyPatient, observation('story-1', { valueString: 'story' })]);

      collection.clear();

      expect(get(collection.resources)).toEqual({});
      expect(get(collection.selectedPatient)).toBe('');

      // A fresh registry: nothing was re-registered, so extending an IPS bundle now is a no-op.
      const result = collection.extendIPS(ipsBundle());
      expect(result.entry[0].resource.section).toEqual([]);
    });
  });
});
