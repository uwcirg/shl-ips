import { describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import { ResourceCollection } from '$lib/utils/ResourceCollection';

// vi.mock factories are hoisted above this file's own top-level const declarations, so
// anything they reference must come from vi.hoisted() rather than a plain const, or the
// factory sees it in its temporal dead zone ("Cannot access '...' before initialization").
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
  INTERMEDIATE_FHIR_SERVER_BASE: 'https://fhir.example.com'
}));

function patient(id: string, overrides: Record<string, unknown> = {}): any {
  return { resourceType: 'Patient', id, ...overrides };
}

function taggedPatient(
  id: string,
  category: string,
  method: string,
  source: string,
  overrides: Record<string, unknown> = {}
): any {
  return {
    resourceType: 'Patient',
    id,
    meta: {
      source,
      tag: [
        { system: CATEGORY_SYSTEM, code: category },
        { system: METHOD_SYSTEM, code: method }
      ]
    },
    ...overrides
  };
}

function observation(id: string, overrides: Record<string, unknown> = {}): any {
  // assignPatientReference only overwrites a field that's already present (`if (field in
  // resource)`), so a real "subject" key has to be here for reference-propagation to do
  // anything. It's stripped by ResourceHelper.simplify() before hashing either way, so it
  // doesn't affect content-based dedup.
  return { resourceType: 'Observation', id, status: 'final', code: { text: 'test' }, subject: {}, ...overrides };
}

describe('ResourceCollection', () => {
  describe('constructor', () => {
    it('starts empty when given nothing', () => {
      const collection = new ResourceCollection();

      expect(get(collection.resources)).toEqual({});
      expect(get(collection.selectedPatient)).toBe('');
      expect(get(collection.patient)).toBeUndefined();
      expect(get(collection.patientReference)).toBe('');
    });

    it('auto-selects a single Patient resource passed to the constructor', () => {
      const collection = new ResourceCollection(patient('p1'));

      expect(get(collection.patient)?.id).toBe('p1');
      expect(get(collection.patientReference)).toBe('Patient/p1');
    });

    it('does not select anything for a single non-Patient resource', () => {
      const collection = new ResourceCollection(observation('o1'));

      expect(get(collection.patient)).toBeUndefined();
      expect(get(collection.patientReference)).toBe('');
    });

    it('adds every resource in an array and selects the Patient among them', () => {
      const collection = new ResourceCollection([observation('o1'), patient('p1')]);

      expect(Object.keys(get(collection.resources))).toHaveLength(2);
      expect(get(collection.patient)?.id).toBe('p1');
    });
  });

  describe('addResource', () => {
    it('deduplicates resources by clinical content, ignoring id/meta/text', () => {
      const collection = new ResourceCollection();
      collection.addResource(observation('o1', { note: [{ text: 'same content' }] }));
      collection.addResource(observation('o2', { note: [{ text: 'same content' }], meta: { lastUpdated: 'x' } }));

      expect(Object.keys(get(collection.resources))).toHaveLength(1);
    });

    it('keeps resources with different clinical content as separate entries', () => {
      const collection = new ResourceCollection();
      collection.addResource(observation('o1', { note: [{ text: 'first' }] }));
      collection.addResource(observation('o2', { note: [{ text: 'second' }] }));

      expect(Object.keys(get(collection.resources))).toHaveLength(2);
    });

    it('assigns the current patient reference to a resource added after the patient', () => {
      const collection = new ResourceCollection();
      collection.addResource(patient('p1'));
      const rh = collection.addResource(observation('o1'));

      expect((rh.resource as any).subject).toEqual({ reference: 'Patient/p1' });
    });

    it('does not switch the selected patient when a second Patient is added', () => {
      const collection = new ResourceCollection();
      collection.addResource(patient('p1'));
      collection.addResource(patient('p2'));

      expect(get(collection.patient)?.id).toBe('p1');
    });
  });

  describe('addResources', () => {
    it('adds every resource and returns their ResourceHelpers', () => {
      const collection = new ResourceCollection();
      const result = collection.addResources([patient('p1'), observation('o1')]);

      expect(result).toHaveLength(2);
      expect(Object.keys(get(collection.resources))).toHaveLength(2);
    });
  });

  describe('updateResource', () => {
    it('replaces the stored resource at its tempId', () => {
      const collection = new ResourceCollection();
      const rh = collection.addResource(observation('o1', { note: [{ text: 'v1' }] }));

      (rh.resource as any).note = [{ text: 'v2 (mutated directly on the stored copy)' }];
      collection.updateResource(rh);

      expect(get(collection.resources)[rh.tempId]).toBe(rh);
    });
  });

  describe('setSelectedPatient', () => {
    it('throws when there are no Patient resources', () => {
      const collection = new ResourceCollection(observation('o1'));

      expect(() => collection.setSelectedPatient('anything')).toThrow('No patients exist');
    });

    it('switches the active patient, updates include flags, and re-propagates references', () => {
      const collection = new ResourceCollection();
      const p1 = collection.addResource(patient('p1'));
      const p2 = collection.addResource(patient('p2'));
      const obs = collection.addResource(observation('o1'));

      collection.setSelectedPatient(p2.tempId);

      expect(get(collection.selectedPatient)).toBe(p2.tempId);
      expect(get(collection.patient)?.id).toBe('p2');
      expect(get(collection.resources)[p1.tempId].include).toBe(false);
      expect(get(collection.resources)[p2.tempId].include).toBe(true);
      expect((get(collection.resources)[obs.tempId].resource as any).subject).toEqual({ reference: 'Patient/p2' });
    });
  });

  describe('removeResources', () => {
    it('removes a resource matched by its clinical content, not its identity', () => {
      const collection = new ResourceCollection();
      const rh = collection.addResource(observation('o1', { note: [{ text: 'to remove' }] }));

      // A structurally-different object (different id/meta) but the same clinical content
      // still matches, since removal keys off the content-derived tempId.
      collection.removeResources([observation('different-id', { note: [{ text: 'to remove' }], meta: { x: 1 } })]);

      expect(get(collection.resources)[rh.tempId]).toBeUndefined();
      expect(Object.keys(get(collection.resources))).toHaveLength(0);
    });
  });

  describe('getResourceCount', () => {
    it('counts every resource when the patient is not a placeholder', () => {
      const collection = new ResourceCollection();
      collection.addResource(taggedPatient('p1', 'labs', 'upload', 'src-1'));
      collection.addResource(observation('o1'));

      expect(collection.getResourceCount()).toBe(2);
    });

    it('excludes the placeholder patient from the count', () => {
      const collection = new ResourceCollection();
      collection.addResource(
        taggedPatient('p1', 'labs', 'upload', 'src-1', {
          meta: {
            source: 'src-1',
            tag: [
              { system: CATEGORY_SYSTEM, code: 'labs' },
              { system: METHOD_SYSTEM, code: 'upload' },
              { system: PLACEHOLDER_SYSTEM, code: 'placeholder-patient' }
            ]
          }
        })
      );
      collection.addResource(observation('o1'));

      expect(collection.getResourceCount()).toBe(1);
    });
  });

  describe('getFHIRResources / getSelectedPatient', () => {
    it('returns the raw FHIR resources and the currently selected patient', () => {
      const collection = new ResourceCollection();
      collection.addResource(patient('p1'));
      collection.addResource(observation('o1'));

      const resources = collection.getFHIRResources();
      expect(resources.map((r: any) => r.resourceType).sort()).toEqual(['Observation', 'Patient']);
      expect(collection.getSelectedPatient()?.id).toBe('p1');
    });
  });

  describe('getTags', () => {
    it('extracts category, method, source, and sourceName from the selected patient', () => {
      const collection = new ResourceCollection();
      collection.addResource(
        taggedPatient('p1', 'labs', 'upload', 'src-1#extra', {
          meta: {
            source: 'src-1#extra',
            tag: [
              { system: CATEGORY_SYSTEM, code: 'labs' },
              { system: METHOD_SYSTEM, code: 'upload' },
              { system: SOURCE_NAME_SYSTEM, code: 'Friendly Name' }
            ]
          }
        })
      );

      expect(collection.getTags()).toEqual({
        category: 'labs',
        method: 'upload',
        source: 'src-1',
        sourceName: 'Friendly Name',
        placeholder: undefined
      });
    });

    it('falls back to the source string when there is no sourceName tag', () => {
      const collection = new ResourceCollection();
      collection.addResource(taggedPatient('p1', 'labs', 'upload', 'src-1'));

      expect(collection.getTags().sourceName).toBe('src-1');
    });
  });

  describe('clear', () => {
    it('empties the resources and selected patient', () => {
      const collection = new ResourceCollection(patient('p1'));

      collection.clear();

      expect(get(collection.resources)).toEqual({});
      expect(get(collection.selectedPatient)).toBe('');
    });
  });

  describe('toJSON / fromJSON', () => {
    it('round-trips resources and the selected patient through JSON', () => {
      const collection = new ResourceCollection();
      collection.addResource(patient('p1'));
      collection.addResource(observation('o1'));

      const json = collection.toJSON();
      expect(typeof json).toBe('string');

      const restored = ResourceCollection.fromJSON(json);

      expect(Object.keys(get(restored.resources))).toHaveLength(2);
      expect(restored.getFHIRResources().map((r: any) => r.resourceType).sort()).toEqual([
        'Observation',
        'Patient'
      ]);
      expect(get(restored.patient)?.id).toBe('p1');
      expect(get(restored.selectedPatient)).toBe(get(collection.selectedPatient));
    });

    it('produces an empty, unselected collection when restoring an empty one', () => {
      const collection = new ResourceCollection();

      const restored = ResourceCollection.fromJSON(collection.toJSON());

      expect(get(restored.resources)).toEqual({});
      expect(get(restored.selectedPatient)).toBe('');
    });
  });
});
