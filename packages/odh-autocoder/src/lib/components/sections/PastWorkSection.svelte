<script lang="ts">
  import type { ComponentType } from 'svelte';
  import type { PastJobEntry } from '../../fhir/values.js';
  import ListSection from './ListSection.svelte';
  import PastJobForm from '../entries/PastJobForm.svelte';
  import JobFieldsCoder from '../coders/JobFieldsCoder.svelte';
  import AutocoderSearchInput from '../coders/AutocoderSearchInput.svelte';

  // The past jobs section: an entry form per job, with Add and Delete. Inside an OdhFormProvider it
  // uses the form's state; otherwise bind entries.

  /** The section's entries, when not inside an OdhFormProvider */
  export let entries: PastJobEntry[] = [];
  /** Makes ids for added entries, when not inside an OdhFormProvider */
  export let createId: (() => string) | undefined = undefined;
  /** Component rendering one job (props: bind:entry, idPrefix, jobCoder, fieldCoder, labels) */
  export let entryForm: ComponentType = PastJobForm;
  /** Codes each job's occupation and industry */
  export let jobCoder: ComponentType = JobFieldsCoder;
  /** Field coder the job coder uses for each field, if it uses one */
  export let fieldCoder: ComponentType | undefined = undefined;
  /** Label text for each job's fields */
  export let labels: Record<string, string> = {};
  export let idPrefix: string = 'past-job';
</script>

<ListSection
  section="pastWork"
  bind:entries
  {createId}
  {entryForm}
  entryProps={{ jobCoder, fieldCoder, labels }}
  {idPrefix}
  noun="past job"
/>
