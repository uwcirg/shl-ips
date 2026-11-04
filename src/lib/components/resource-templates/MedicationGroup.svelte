<script lang="ts">
  import { Button } from '@sveltestrap/sveltestrap';
  import type { GroupUnit, MedicationData } from '$lib/stores/displayUnits';
  import type { ResourceHelper } from '$lib/utils/ResourceHelper';
  import ResourceDisplay from '$lib/components/app/ResourceDisplay.svelte';

  // A MedicationStatement or MedicationRequest with the Medication it references. The parent's own
  // template shows the medication when it is given as an entry, so this shows the parent that way
  // and the medication appears only here, not as a row of its own.
  export let unit: GroupUnit<MedicationData>;
  // Part of the group template contract; this template resolves everything from the unit itself
  // svelte-ignore unused-export-let
  export let entries: unknown[] = [];
  // Called with a resource's helper when a "View" button is pressed (advanced mode only)
  export let onView: ((rh: ResourceHelper) => void) | undefined = undefined;
  export let advanced = false;

  $: parent = unit.data.parent;
  $: medication = unit.data.medication;
  $: medicationEntries = [{ resource: medication.rh.resource }];
</script>

<div class="d-flex justify-content-between align-items-start gap-2">
  <div class="flex-grow-1" style="min-width: 0;">
    <ResourceDisplay resource={parent.rh.resource} renderInfo={parent.renderInfo} entries={medicationEntries} />
  </div>
  {#if advanced && onView}
    <div class="d-flex flex-column gap-1">
      <Button size="sm" color="secondary" outline on:click={() => onView?.(parent.rh)}>View</Button>
      <Button size="sm" color="secondary" outline on:click={() => onView?.(medication.rh)}>View medication</Button>
    </div>
  {/if}
</div>
