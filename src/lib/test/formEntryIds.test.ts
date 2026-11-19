import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import type { Condition, Goal, MedicationStatement, Observation, Patient, Resource } from 'fhir/r4';
import PatientStory from '$lib/components/app/PatientStory.svelte';
import PatientMedical from '$lib/components/app/PatientMedical.svelte';
import PatientNeeds from '$lib/components/app/PatientNeeds.svelte';
import PatientBody from '$lib/components/app/PatientBody.svelte';
import { ResourceHelper } from '$lib/utils/ResourceHelper';
import type { IResourceCollection, ResourceRetrieveEvent } from '$lib/utils/types';
import {
  diffDataset,
  matchBySourceIdentifier,
  prepareImportedResources,
  sourceIdSystem
} from '$lib/utils/importNormalization';

// importNormalization and the forms read the instance config at load time
vi.mock('$lib/config/config', () => ({
  SOURCE_NAMESPACE: 'urn:test:source',
  PLACEHOLDER_SYSTEM: 'http://test.example.com/placeholder',
  CATEGORY_SYSTEM: 'http://test.example.com/category',
  METHOD_SYSTEM: 'http://test.example.com/method',
  SOURCE_NAME_SYSTEM: 'http://test.example.com/source-name',
  OBSERVATION_CATEGORY_SYSTEM: 'http://test.example.com/observation-category'
}));

// Each of these forms saves every entry under the id it was first saved with, so that the
// import matches a re-saved resource to the stored one (see formEntryIds).

const SOURCE = window.location.origin;
const MASTER_PATIENT: Patient = { resourceType: 'Patient', id: 'master-1' };
const UUID = /^[0-9a-f-]{36}$/;

// As stored after an earlier save: a server id, with the form's id as the source identifier
function stored<T extends Resource>(resource: T, serverId: string, formId: string): T {
  return {
    ...resource,
    id: serverId,
    identifier: [{ system: sourceIdSystem(SOURCE, resource.resourceType), value: formId }]
  };
}

function formDataFor(resources: Resource[]): IResourceCollection {
  const map = Object.fromEntries(resources.map((r, i) => [`r${i}`, new ResourceHelper(r)]));
  return { resources: writable(map) } as unknown as IResourceCollection;
}

function renderForm(component: any, resources?: Resource[]) {
  const events: ResourceRetrieveEvent[] = [];
  const { component: instance } = render(component, {
    props: { formData: resources ? formDataFor(resources) : undefined }
  });
  instance.$on('update-resources', (e: CustomEvent<ResourceRetrieveEvent>) => events.push(e.detail));
  return events;
}

const save = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

const ids = (event: ResourceRetrieveEvent) => (event.resources as Resource[]).map(r => r.id);

// Re-saving matches every stored resource it still includes, and only the deleted ones are removed
function expectOnlyRemoved(event: ResourceRetrieveEvent, existing: Resource[], removedIds: string[]) {
  const incoming = prepareImportedResources(event, MASTER_PATIENT).map(e => e.resource);
  const diff = diffDataset(incoming, existing, matchBySourceIdentifier(SOURCE));
  expect(diff.added).toEqual([]);
  expect(diff.removed.map(r => r.id)).toEqual(removedIds);
  const matched = [...diff.updated, ...diff.unchanged].map(m => m.existing.id);
  expect(matched.sort()).toEqual(existing.map(r => r.id).filter(id => !removedIds.includes(id!)).sort());
}

const goal = (text: string): Goal => ({
  resourceType: 'Goal',
  lifecycleStatus: 'active',
  subject: { reference: 'Patient/pat1' },
  description: { text },
  achievementStatus: { coding: [{ code: 'not-achieved' }] }
});

const story: Observation = {
  resourceType: 'Observation',
  status: 'final',
  code: { coding: [{ system: 'http://loinc.org', code: '51855-5' }] },
  valueString: 'My story'
};

const condition = (text: string, status: 'active' | 'inactive'): Condition => ({
  resourceType: 'Condition',
  subject: { reference: 'Patient/pat1' },
  clinicalStatus: {
    coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: status }]
  },
  code: { text }
});

const medication = (text: string): MedicationStatement => ({
  resourceType: 'MedicationStatement',
  status: 'active',
  subject: { reference: 'Patient/pat1' },
  medicationCodeableConcept: { text }
});

describe('PatientStory ids', () => {
  it('gives new entries new ids', async () => {
    const events = renderForm(PatientStory);
    await fireEvent.input(screen.getAllByRole('textbox')[0], { target: { value: 'About me' } });
    await fireEvent.input(screen.getAllByRole('textbox')[1], { target: { value: 'A goal' } });
    await save('Save your story and goals');

    const saved = ids(events[0]);
    expect(saved).toHaveLength(2);
    expect(saved.every(id => UUID.test(id!))).toBe(true);
    expect(new Set(saved).size).toBe(2);
  });

  it('saves each entry under the id it was first saved with, so deleting one removes only it', async () => {
    const existing = [
      stored(goal('Walk daily'), 'srv-1', 'goal-a'),
      stored(goal('Sleep better'), 'srv-2', 'goal-b'),
      stored(story, 'srv-3', 'story-1')
    ];
    const events = renderForm(PatientStory, existing);

    await fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    await save('Save your story and goals');

    expect(ids(events[0])).toEqual(['goal-b', 'story-1']);
    expectOnlyRemoved(events[0], existing, ['srv-1']);
  });
});

describe('PatientMedical ids', () => {
  it('saves each entry under the id it was first saved with, so deleting one removes only it', async () => {
    const existing = [
      stored(condition('Asthma', 'active'), 'srv-1', 'problem-a'),
      stored(condition('Diabetes', 'active'), 'srv-2', 'problem-b'),
      stored(medication('Albuterol'), 'srv-3', 'med-a'),
      stored(condition('Broken arm', 'inactive'), 'srv-4', 'history-a')
    ];
    const events = renderForm(PatientMedical, existing);

    // Problems have two entries, so those are the only Remove buttons (the others say Clear)
    await fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]);
    await save('Save your conditions, medications and history');

    expect(ids(events[0])).toEqual(['problem-b', 'med-a', 'history-a']);
    expectOnlyRemoved(events[0], existing, ['srv-1']);
  });
});

describe('saving without edits', () => {
  it('reuses stored dates and leaves out empty fields, so the import sees no changes', async () => {
    // As the server returns it: no empty fields, and the date the entry was first saved
    const problem: Condition = {
      resourceType: 'Condition',
      clinicalStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active'
        }]
      },
      subject: { reference: 'Patient/pat1' },
      recordedDate: '2020-01-01',
      code: { text: 'Asthma' }
    };
    const existing = [stored(problem, 'srv-1', 'problem-a')];
    const events = renderForm(PatientMedical, existing);

    await save('Save your conditions, medications and history');

    const [saved] = events[0].resources as Condition[];
    expect(saved.recordedDate).toBe('2020-01-01');
    expect(saved.severity).toBeUndefined();
    const incoming = prepareImportedResources(events[0], MASTER_PATIENT).map(e => e.resource);
    const diff = diffDataset(incoming, existing, matchBySourceIdentifier(SOURCE));
    expect(diff.added).toEqual([]);
    expect(diff.updated).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged.map(m => m.existing.id)).toEqual(['srv-1']);
  });
});

describe('PatientNeeds ids', () => {
  it('saves a stored need under the id it was first saved with', async () => {
    const visual: Condition = {
      resourceType: 'Condition',
      subject: { reference: 'Patient/pat1' },
      code: { coding: [{ system: 'http://snomed.info/sct', code: '397540003' }] }
    };
    const existing = [stored(visual, 'srv-1', 'need-visual')];
    const events = renderForm(PatientNeeds, existing);

    await fireEvent.click(screen.getByLabelText('Hearing / Listening'));
    await save('Save your care needs');

    const saved = events[0].resources as Condition[];
    expect(saved.map(r => r.code?.coding?.[0].code)).toEqual(['397540003', '15188001']);
    expect(saved[0].id).toBe('need-visual');
    expect(UUID.test(saved[1].id!)).toBe(true);
  });
});

describe('PatientBody ids', () => {
  it('saves a stored concern under the id it was first saved with', async () => {
    const uterus: Condition = {
      resourceType: 'Condition',
      subject: { reference: 'Patient/pat1' },
      bodySite: [{ coding: [{ code: '35039007' }] }],
      code: { text: 'Cramping' }
    };
    const existing = [stored(uterus, 'srv-1', 'concern-a')];
    const events = renderForm(PatientBody, existing);

    await save('Save your body concerns');

    expect(ids(events[0])).toEqual(['concern-a']);
    expectOnlyRemoved(events[0], existing, []);
  });

  it('saves an unedited concern as unchanged', async () => {
    // As the server returns it
    const stored1: Condition = {
      resourceType: 'Condition',
      clinicalStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active'
        }]
      },
      category: [{
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'problem-list-item' }]
      }],
      code: { text: 'Cramping' },
      bodySite: [{
        coding: [{ system: 'https://www.snomed.info/sct', code: '35039007', display: 'Uterus' }]
      }],
      subject: { reference: 'Patient/pat1' },
      recordedDate: '2020-01-01'
    };
    const existing = [stored(stored1, 'srv-1', 'concern-a')];
    const events = renderForm(PatientBody, existing);

    await save('Save your body concerns');

    const incoming = prepareImportedResources(events[0], MASTER_PATIENT).map(e => e.resource);
    const diff = diffDataset(incoming, existing, matchBySourceIdentifier(SOURCE));
    expect(diff.updated).toEqual([]);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toHaveLength(1);
  });

  it('keeps every stored concern, including ones with no body site', async () => {
    const withSite: Condition = {
      resourceType: 'Condition',
      subject: { reference: 'Patient/pat1' },
      bodySite: [{ coding: [{ code: '35039007' }] }],
      code: { text: 'Cramping' }
    };
    const noSite = (text: string): Condition => ({
      resourceType: 'Condition',
      subject: { reference: 'Patient/pat1' },
      code: { text }
    });
    const existing = [
      stored(withSite, 'srv-1', 'concern-a'),
      stored(noSite('Fungal infection'), 'srv-2', 'concern-b'),
      stored(noSite('Knee pain'), 'srv-3', 'concern-c')
    ];
    const events = renderForm(PatientBody, existing);

    await save('Save your body concerns');

    expect(ids(events[0])).toEqual(['concern-a', 'concern-b', 'concern-c']);
    expectOnlyRemoved(events[0], existing, []);
  });
});
