import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { writable } from 'svelte/store';
import type { Observation } from 'fhir/r4';
import ODHForm from '$lib/components/app/ODHForm.svelte';
import { ResourceHelper } from '$lib/utils/ResourceHelper';
import { fakeAuth } from '$lib/test/mocks';
import type { IResourceCollection, ResourceRetrieveEvent } from '$lib/utils/types';

// Characterization tests: these capture the FHIR resources the form emits today, so the
// extraction into the odh-autocoder package can prove its output is unchanged. The fixture
// files under fixtures/odh are the reference; the package's builder tests compare against
// the same files.

const ODH_JOB_PROFILE = 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob';
const IS_CURRENT_JOB = 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension';

type Job = {
  occupation?: { code: string; display: string };
  industry?: { code: string; display: string };
  start?: string;
  end?: string;
};

function job(current: boolean, { occupation, industry, start, end }: Job): Observation {
  const period: Record<string, string> = {};
  if (start) period.start = start;
  if (end) period.end = end;
  return {
    resourceType: 'Observation',
    id: crypto.randomUUID(),
    meta: { profile: [ODH_JOB_PROFILE] },
    extension: [{ url: IS_CURRENT_JOB, valueBoolean: current }],
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', code: '11341-5' }] },
    ...(start || end ? { effectivePeriod: period } : {}),
    valueCodeableConcept: { coding: occupation ? [occupation] : [] },
    component: [
      {
        code: { coding: [{ system: 'http://loinc.org', code: '86188-0' }] },
        valueCodeableConcept: { coding: industry ? [industry] : [] }
      }
    ]
  };
}

function employmentStatus(display: string): Observation {
  return {
    resourceType: 'Observation',
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', code: '74165-2' }] },
    valueCodeableConcept: { coding: [{ code: display.replace(/ /g, ''), display }] }
  };
}

function retirementDate(valueDateTime: string): Observation {
  return {
    resourceType: 'Observation',
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', code: '87510-4' }] },
    valueDateTime
  };
}

function combatPeriod(start?: string, end?: string): Observation {
  return {
    resourceType: 'Observation',
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', code: '87511-2' }] },
    valuePeriod: { ...(start ? { start } : {}), ...(end ? { end } : {}) }
  };
}

function formDataFor(resources: Observation[]): IResourceCollection {
  const map = Object.fromEntries(resources.map((r, i) => [`r${i}`, new ResourceHelper(r)]));
  return { resources: writable(map) } as unknown as IResourceCollection;
}

async function saveAndCapture(resources?: Observation[]): Promise<ResourceRetrieveEvent> {
  const events: ResourceRetrieveEvent[] = [];
  const { component } = render(ODHForm, {
    props: { formData: resources ? formDataFor(resources) : undefined },
    context: new Map([['authService', fakeAuth()]])
  });
  component.$on('update-resources', (e: CustomEvent<ResourceRetrieveEvent>) => events.push(e.detail));
  await fireEvent.click(screen.getByRole('button', { name: 'Save work info' }));
  expect(events).toHaveLength(1);
  return events[0];
}

function fixture(name: string) {
  return `./fixtures/odh/${name}.json`;
}

async function expectFixture(event: ResourceRetrieveEvent, name: string) {
  await expect(JSON.stringify(event.resources, null, 2) + '\n').toMatchFileSnapshot(fixture(name));
}

const NURSE = { code: '29-1141', display: 'Registered Nurses' };
const HOSPITALS = { code: '622000', display: 'General Medical and Surgical Hospitals' };
const CENSUS_OCCUPATION = { code: '3255', display: 'Registered nurses' };
const COOK = { code: '35-2014', display: 'Cooks, Restaurant' };
const RESTAURANTS = { code: '722511', display: 'Full-Service Restaurants' };

describe('ODHForm FHIR output', () => {
  it('tags the emitted resources with the ODH category, method and source', async () => {
    const event = await saveAndCapture();
    expect(event.category).toBe('occupational-data-for-health');
    expect(event.method).toBe('occupational-data-for-health-form');
    expect(event.source).toBe(window.location.origin);
    expect(event.sourceName).toBe('My Work Info');
  });

  it('emits default resources for an untouched form', async () => {
    await expectFixture(await saveAndCapture(), 'default');
  });

  // Known issue (kept for now): a year-only date such as '2009' doesn't fit the month inputs'
  // YYYY-MM format, so it is dropped on the way through the form.
  it('round-trips existing ODH resources through the form', async () => {
    const event = await saveAndCapture([
      employmentStatus('Employed'),
      job(true, { occupation: NURSE, industry: HOSPITALS, start: '2019-03' }),
      job(true, { occupation: CENSUS_OCCUPATION, start: '2021-06-15T08:00:00Z' }),
      job(false, { occupation: COOK, industry: RESTAURANTS, start: '2010-01', end: '2014-12-31' }),
      job(false, { industry: RESTAURANTS, end: '2009' }),
      retirementDate('2015-01-01'),
      combatPeriod('2005-02', '2006-08'),
      combatPeriod('2007-04')
    ]);
    await expectFixture(event, 'round-trip');
  });

  it('collapses duplicate entries', async () => {
    const event = await saveAndCapture([
      employmentStatus('Employed'),
      job(true, { occupation: NURSE, industry: HOSPITALS, start: '2019-03' }),
      job(false, { occupation: COOK, industry: RESTAURANTS, start: '2010-01', end: '2014-12' }),
      job(false, { occupation: COOK, industry: RESTAURANTS, start: '2010-01', end: '2014-12' }),
      retirementDate('2015-01'),
      retirementDate('2015-01')
    ]);
    await expectFixture(event, 'duplicates');
  });

  it('uses the employment status from existing resources', async () => {
    const event = await saveAndCapture([
      employmentStatus('Not in labor force'),
      job(false, { occupation: COOK, industry: RESTAURANTS, start: '2010-01', end: '2014-12' })
    ]);
    await expectFixture(event, 'not-in-labor-force');
  });

  // Known issue (to be fixed after extraction): when the first current job has no start date,
  // the employment status loses its effective period even though a later job has one.
  it('first current job without a start date', async () => {
    const event = await saveAndCapture([
      employmentStatus('Employed'),
      job(true, { occupation: NURSE, industry: HOSPITALS }),
      job(true, { occupation: COOK, industry: RESTAURANTS, start: '2020-02' })
    ]);
    await expectFixture(event, 'first-job-no-start');
  });

  // Known issue (to be fixed after extraction): the employment status takes its effective
  // period from current jobs even when the status isn't Employed (no current jobs are emitted).
  it('unemployed with a current job on file', async () => {
    const event = await saveAndCapture([
      employmentStatus('Unemployed'),
      job(true, { occupation: NURSE, industry: HOSPITALS, start: '2018-05' })
    ]);
    await expectFixture(event, 'unemployed-with-current-job');
  });
});
