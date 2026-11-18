<script lang="ts">
  import { Col, FormGroup, Row } from '@sveltestrap/sveltestrap';
  import type { ComponentType } from 'svelte';
  import type { CurrentJobEntry } from '../../fhir/values.js';
  import MonthInput from '../MonthInput.svelte';
  import JobFieldsCoder from '../coders/JobFieldsCoder.svelte';
  import '../odh-layout.css';

  // Entry form for one current job: its occupation and industry (the job coder), and when it
  // started. The "actions" slot goes at the end of the last row (the section's Delete button).

  export let entry: CurrentJobEntry;
  /** Prefix for the inputs' element ids */
  export let idPrefix: string;
  /** Codes the occupation and industry (props: bind:occupation, bind:industry, idPrefix, tense) */
  export let jobCoder: ComponentType = JobFieldsCoder;
  /** Field coder for the job coder to use for each field, if it uses them (JobFieldsCoder does) */
  export let fieldCoder: ComponentType | undefined = undefined;
  export let labels: { occupation?: string; industry?: string; start?: string } = {};

  // Only passed when set, so job coders without field coders needn't declare it
  $: coderProps = fieldCoder ? { fieldCoder } : {};
</script>

<FormGroup>
  <svelte:component
    this={jobCoder}
    bind:occupation={entry.occupation}
    bind:industry={entry.industry}
    {idPrefix}
    {...coderProps}
    {labels}
    tense="current"
  />
  <Row class="mb-4 pb-4 border-bottom gy-2">
    <Col xs="auto" class="odh-inline-group">
      <span class="odh-label">{labels.start ?? 'I started this job:'}</span>
      <MonthInput bind:value={entry.start} />
    </Col>
    <slot name="actions" />
  </Row>
</FormGroup>
