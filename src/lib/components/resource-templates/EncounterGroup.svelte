<script lang="ts">
  import { Button } from '@sveltestrap/sveltestrap';
  import type { Encounter } from 'fhir/r4';
  import type { EncounterData, GroupUnit } from '$lib/stores/displayUnits';
  import type { ResourceHelper } from '$lib/utils/ResourceHelper';
  import EncounterCard from '$lib/components/resource-templates/EncounterCard.svelte';

  export let unit: GroupUnit<EncounterData>;
  // Part of the group template contract; this template resolves everything from the unit itself
  // svelte-ignore unused-export-let
  export let entries: unknown[] = [];
  // Called with a resource's helper when a "View" button is pressed (advanced mode only)
  export let onView: ((rh: ResourceHelper) => void) | undefined = undefined;
  export let advanced = false;

  // Svelte 4 doesn't allow TS syntax in markup, so casts live here
  const asEncounter = (rh: ResourceHelper) => rh.resource as Encounter;

  $: encounter = asEncounter(unit.data.encounter.rh);
  $: related = unit.data.related;
</script>

<EncounterCard {encounter} {related}>
  <svelte:fragment slot="actions">
    {#if advanced && onView}
      <Button size="sm" color="secondary" outline on:click={() => onView?.(unit.data.encounter.rh)}>View</Button>
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="related-actions" let:reference>
    {#if advanced && onView && related[reference]}
      <Button size="sm" color="secondary" outline on:click={() => onView?.(related[reference].rh)}>View</Button>
    {/if}
  </svelte:fragment>
</EncounterCard>
