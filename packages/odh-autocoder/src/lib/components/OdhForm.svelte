<script lang="ts">
  import { Accordion, AccordionItem, Button, Col, Row, Spinner } from '@sveltestrap/sveltestrap';
  import type { ComponentType } from 'svelte';
  import type { Observation, Reference } from 'fhir/r4';
  import { ODH_SECTIONS, type OdhListSectionKey, type OdhSectionKey } from '../fhir/values.js';
  import OdhFormProvider from './OdhFormProvider.svelte';
  import EmploymentStatusSection from './sections/EmploymentStatusSection.svelte';
  import CurrentWorkSection from './sections/CurrentWorkSection.svelte';
  import PastWorkSection from './sections/PastWorkSection.svelte';
  import RetirementDateSection from './sections/RetirementDateSection.svelte';
  import CombatPeriodSection from './sections/CombatPeriodSection.svelte';
  import JobFieldsCoder from './coders/JobFieldsCoder.svelte';

  // A ready-made ODH form: OdhFormProvider laid out as an accordion of sections, with Save and
  // Clear buttons. For another layout, use OdhFormProvider and the sections directly.

  /** Existing ODH resources to edit; undefined for a new, empty form */
  export let resources: Observation[] | undefined = undefined;
  /** Shows the save button as busy */
  export let processing: boolean = false;
  /** The app's autocoder endpoint (see createAutocoderHandler in odh-autocoder/server) */
  export let endpoint: string = '/api/nio-autocoder';
  /** When set, autocoder requests carry an Authorization: Bearer header with its token */
  export let getAccessToken: (() => Promise<string | undefined>) | undefined = undefined;
  /** Subject of the saved resources (e.g. the patient); they have none when not given */
  export let subject: Reference | undefined = undefined;
  /** Called with the ODH resources built from the form when the user saves */
  export let onsave: ((resources: Observation[]) => void) | undefined = undefined;
  /** The id for the entry read from a resource (becomes the saved resource's id). Defaults to resource.id. */
  export let getId: ((resource: Observation) => string | undefined) | undefined = undefined;
  /** Makes an id for each new entry. Without it, new entries' resources have no id. */
  export let createId: (() => string) | undefined = undefined;
  /** Sections to show (and save), in order. Current work also needs employmentStatus. */
  export let sections: readonly OdhSectionKey[] = ODH_SECTIONS;
  /** Replaces a list section's entry form */
  export let entryForms: Partial<Record<OdhListSectionKey, ComponentType>> = {};
  /** Codes each job's occupation and industry */
  export let jobCoder: ComponentType = JobFieldsCoder;
  /** Field coder for the job coder to use for each field, if it uses them (JobFieldsCoder does) */
  export let fieldCoder: ComponentType | undefined = undefined;

  const HEADERS: Record<OdhSectionKey, string> = {
    employmentStatus: 'Current work',
    currentWork: 'Current work',
    pastWork: 'Past work',
    retirementDates: 'Retirement date',
    combatPeriods: 'Combat zone work/hazardous duty'
  };

  // Employment status and current work share the "Current work" item
  $: items = sections.filter(
    (section) => !(section === 'currentWork' && sections.includes('employmentStatus'))
  );
  $: jobProps = { jobCoder, fieldCoder };
</script>

<OdhFormProvider
  {resources}
  {getId}
  {createId}
  {subject}
  {onsave}
  {processing}
  {endpoint}
  {getAccessToken}
  let:isWorking
  let:submit
  let:reset
>
  <Accordion stayOpen>
    {#each items as section (section)}
      <AccordionItem active class="odh-section" header={HEADERS[section]}>
        {#if section === 'employmentStatus'}
          <EmploymentStatusSection />
          {#if isWorking && sections.includes('currentWork')}
            <CurrentWorkSection {...jobProps} entryForm={entryForms.currentWork} />
          {/if}
        {:else if section === 'currentWork'}
          <CurrentWorkSection {...jobProps} entryForm={entryForms.currentWork} />
        {:else if section === 'pastWork'}
          <PastWorkSection {...jobProps} entryForm={entryForms.pastWork} />
        {:else if section === 'retirementDates'}
          <RetirementDateSection entryForm={entryForms.retirementDates} />
        {:else if section === 'combatPeriods'}
          <CombatPeriodSection entryForm={entryForms.combatPeriods} />
        {/if}
      </AccordionItem>
    {/each}
  </Accordion>
  <br>
  <Row class="justify-content-between align-content-center">
    <Col xs="auto">
      <Button color="primary" on:click={submit} disabled={processing}>
        {processing ? 'Saving...' : 'Save work info'}
      </Button>
    </Col>
    <Col class="d-flex justify-content-start align-items-center px-0 flex-grow-1">
      {#if processing}
      <Spinner color="primary" type="border" size="md"/>
      {/if}
    </Col>
    <Col class="d-flex justify-content-end align-items-start">
      <Button color="danger" outline on:click={reset}>
        Clear changes
      </Button>
    </Col>
  </Row>
</OdhFormProvider>

<style>
  :global(.odh-section > .accordion-collapse.show) {
    overflow: visible !important;
  }
</style>
