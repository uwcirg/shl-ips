import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { writable } from 'svelte/store';
import type { Observation, Patient } from 'fhir/r4';
import ODHForm from '$lib/components/app/ODHForm.svelte';
import { ResourceHelper } from '$lib/utils/ResourceHelper';
import { fakeAuth } from '$lib/test/mocks';
import type { IResourceCollection, ResourceRetrieveEvent } from '$lib/utils/types';
import {
  diffDataset,
  matchBySourceIdentifier,
  prepareImportedResources,
  pruneUnlinkedEntries,
  sourceIdSystem
} from '$lib/utils/importNormalization';

// importNormalization reads the instance config at load time
vi.mock('$lib/config/config', () => ({
  SOURCE_NAMESPACE: 'urn:test:source',
  PLACEHOLDER_SYSTEM: 'http://test.example.com/placeholder',
  CATEGORY_SYSTEM: 'http://test.example.com/category',
  METHOD_SYSTEM: 'http://test.example.com/method',
  SOURCE_NAME_SYSTEM: 'http://test.example.com/source-name'
}));

// ODHForm adapts the odh-autocoder package's form to this app. The form itself, and the FHIR
// it produces, are tested in packages/odh-autocoder. These tests cover the app wiring: the
// dataset store going in, the update-resources event coming out, and the user's token on
// autocoder requests.

const currentJob: Observation = {
  resourceType: 'Observation',
  status: 'final',
  extension: [
    { url: 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension', valueBoolean: true }
  ],
  code: { coding: [{ system: 'http://loinc.org', code: '11341-5' }] },
  effectivePeriod: { start: '2019-03' },
  valueCodeableConcept: { coding: [{ code: '29-1141', display: 'Registered Nurses' }] },
  component: [
    {
      code: { coding: [{ system: 'http://loinc.org', code: '86188-0' }] },
      valueCodeableConcept: { coding: [{ code: '622000', display: 'General Medical and Surgical Hospitals' }] }
    }
  ]
};

function formDataFor(resources: Observation[]): IResourceCollection {
  const map = Object.fromEntries(resources.map((r, i) => [`r${i}`, new ResourceHelper(r)]));
  return { resources: writable(map) } as unknown as IResourceCollection;
}

const MASTER_PATIENT: Patient = { resourceType: 'Patient', id: 'master-1' };

function renderForm(formData?: IResourceCollection) {
  const auth = fakeAuth();
  const masterPatient = writable<ResourceHelper | null>(new ResourceHelper(MASTER_PATIENT));
  const events: ResourceRetrieveEvent[] = [];
  const { component } = render(ODHForm, {
    props: { formData },
    context: new Map<string, unknown>([
      ['authService', auth],
      ['fhirDataService', { masterPatient }]
    ])
  });
  component.$on('update-resources', (e: CustomEvent<ResourceRetrieveEvent>) => events.push(e.detail));
  return { auth, events, masterPatient };
}

async function save() {
  await fireEvent.click(screen.getByRole('button', { name: 'Save work info' }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ODHForm', () => {
  it('tags saved resources with the ODH category, method and source', async () => {
    const { events } = renderForm();
    await save();

    expect(events).toHaveLength(1);
    expect(events[0].category).toBe('occupational-data-for-health');
    expect(events[0].method).toBe('occupational-data-for-health-form');
    expect(events[0].source).toBe(window.location.origin);
    expect(events[0].sourceName).toBe('My Work Info');
    // A new form's entries get new ids
    const ids = (events[0].resources as Observation[]).map(r => r.id);
    expect(ids).toHaveLength(2);
    expect(ids.every(id => /^[0-9a-f-]{36}$/.test(id!))).toBe(true);
    expect(new Set(ids).size).toBe(2);
  });

  it("makes the user's master patient the subject, so the import keeps the resources", async () => {
    const { events } = renderForm(formDataFor([currentJob]));
    await save();

    const resources = events[0].resources as Observation[];
    expect(resources.map(r => r.subject)).toEqual(resources.map(() => ({ reference: 'Patient/master-1' })));

    // Resources without a patient reference are dropped on import (pruneUnlinkedEntries)
    const entries = prepareImportedResources(events[0], MASTER_PATIENT);
    const kept = pruneUnlinkedEntries(entries).map(e => e.resource.id);
    expect(kept).toEqual(expect.arrayContaining(resources.map(r => r.id)));
  });

  it('uses the master patient current at save time', async () => {
    const { events, masterPatient } = renderForm();
    masterPatient.set(new ResourceHelper({ resourceType: 'Patient', id: 'master-2' }));
    await tick();
    await save();

    expect((events[0].resources as Observation[])[0].subject).toEqual({ reference: 'Patient/master-2' });
  });

  it('edits the resources in the dataset being edited', async () => {
    const { events } = renderForm(formDataFor([currentJob]));
    await save();

    const job = (events[0].resources as Observation[]).find(r => r.code?.coding?.[0].code === '11341-5');
    expect(job?.effectivePeriod).toEqual({ start: '2019-03' });
    expect(job?.valueCodeableConcept?.coding?.[0].code).toBe('29-1141');
    expect(job?.component?.[0].valueCodeableConcept?.coding?.[0].code).toBe('622000');
  });

  it('saves each entry under the id it was first saved with, so deleting one removes only it', async () => {
    const SOURCE = window.location.origin;
    // As stored after an earlier save: server ids, with the form's ids as source identifiers
    const stored = (resource: Observation, serverId: string, sourceId: string): Observation => ({
      ...resource,
      id: serverId,
      identifier: [{ system: sourceIdSystem(SOURCE, 'Observation'), value: sourceId }],
      subject: { reference: 'Patient/dataset-patient' }
    });
    const pastJob = (occupation: string): Observation => ({
      ...currentJob,
      extension: [{ ...currentJob.extension![0], valueBoolean: false }],
      effectivePeriod: { start: '2010-01', end: '2012-01' },
      valueCodeableConcept: { coding: [{ code: occupation, display: occupation }] }
    });
    const existing = [
      stored(
        {
          resourceType: 'Observation',
          status: 'final',
          code: { coding: [{ system: 'http://loinc.org', code: '74165-2' }] },
          valueCodeableConcept: { coding: [{ code: 'Employed', display: 'Employed' }] }
        },
        'srv-1',
        'status-1'
      ),
      stored(currentJob, 'srv-2', 'job-current'),
      stored(pastJob('35-2014'), 'srv-3', 'job-a'),
      stored(pastJob('47-2061'), 'srv-4', 'job-b')
    ];
    const { events } = renderForm(formDataFor(existing));

    // The first past job (job-a): Delete buttons are for the current job, then past jobs
    await fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1]);
    await save();

    const saved = events[0].resources as Observation[];
    expect(saved.map(r => r.id)).toEqual(['status-1', 'job-current', 'job-b']);

    const incoming = prepareImportedResources(events[0], MASTER_PATIENT).map(e => e.resource);
    const diff = diffDataset(incoming, existing, matchBySourceIdentifier(SOURCE));
    expect(diff.added).toEqual([]);
    expect(diff.removed.map(r => r.id)).toEqual(['srv-3']);
    expect([...diff.updated, ...diff.unchanged].map(m => m.existing.id).sort()).toEqual([
      'srv-1',
      'srv-2',
      'srv-4'
    ]);
  });

  it("calls this app's autocoder endpoint with the user's token", async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ Industry: [], Occupation: [], Scheme: '' })
    }));
    vi.stubGlobal('fetch', fetch);
    const { auth } = renderForm();

    await fireEvent.input(screen.getByPlaceholderText('Search occupation...'), {
      target: { value: 'nurse' }
    });

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('/api/nio-autocoder?o=nurse&c=0');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer access-token-1');
    expect(auth.getAccessToken).toHaveBeenCalled();
  });
});
