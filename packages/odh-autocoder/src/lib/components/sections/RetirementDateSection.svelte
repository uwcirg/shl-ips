<script lang="ts">
  import type { ComponentType } from 'svelte';
  import type { RetirementDateEntry } from '../../fhir/values.js';
  import ListSection from './ListSection.svelte';
  import RetirementDateForm from '../entries/RetirementDateForm.svelte';

  // The retirement dates section: an entry form for each, with Add and Delete. Inside an OdhFormProvider
  // it uses the form's state; otherwise bind entries.

  /** The section's entries, when not inside an OdhFormProvider */
  export let entries: RetirementDateEntry[] = [];
  /** Makes ids for added entries, when not inside an OdhFormProvider */
  export let createId: (() => string) | undefined = undefined;
  /** Component rendering one entry (props: bind:entry, idPrefix, labels) */
  export let entryForm: ComponentType = RetirementDateForm;
  /** Label text for each entry's fields */
  export let labels: Record<string, string> = {};
  export let idPrefix: string = 'retirement-date';
</script>

<ListSection
  section="retirementDates"
  bind:entries
  {createId}
  {entryForm}
  entryProps={{ labels }}
  {idPrefix}
  noun="retirement date"
/>
