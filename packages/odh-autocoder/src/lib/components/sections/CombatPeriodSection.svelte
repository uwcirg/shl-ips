<script lang="ts">
  import type { ComponentType } from 'svelte';
  import type { CombatPeriodEntry } from '../../fhir/values.js';
  import ListSection from './ListSection.svelte';
  import CombatPeriodForm from '../entries/CombatPeriodForm.svelte';

  // The combat periods section: an entry form for each, with Add and Delete. Inside an OdhFormProvider
  // it uses the form's state; otherwise bind entries.

  /** The section's entries, when not inside an OdhFormProvider */
  export let entries: CombatPeriodEntry[] = [];
  /** Makes ids for added entries, when not inside an OdhFormProvider */
  export let createId: (() => string) | undefined = undefined;
  /** Component rendering one entry (props: bind:entry, idPrefix, labels) */
  export let entryForm: ComponentType = CombatPeriodForm;
  /** Label text for each entry's fields */
  export let labels: Record<string, string> = {};
  export let idPrefix: string = 'combat-period';
</script>

<ListSection
  section="combatPeriods"
  bind:entries
  {createId}
  {entryForm}
  entryProps={{ labels }}
  {idPrefix}
  noun="combat period"
/>
