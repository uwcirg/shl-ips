<script lang="ts">
  import type { BundleEntry } from 'fhir/r4';
  import type { DisplayUnit } from '$lib/stores/displayUnits';
  import type { ResourceHelper } from '$lib/utils/ResourceHelper';
  import { GROUP_COMPONENTS } from '$lib/config/resource_config';
  import ResourceDisplay from '$lib/components/app/ResourceDisplay.svelte';
  import DisplayOptions from '$lib/components/resource-templates/DisplayOptions.svelte';

  export let unit: DisplayUnit;
  export let entries: BundleEntry[] = [];
  export let advanced = false;
  export let onView: ((rh: ResourceHelper) => void) | undefined = undefined;
  // Code badge settings, as on ResourceDisplay
  export let codeBadges: 'always' | 'never' | 'advanced' | undefined = undefined;
  export let showCodes: boolean | undefined = undefined;
</script>

{#if unit.kind === 'group' && GROUP_COMPONENTS[unit.groupType]}
  <DisplayOptions {codeBadges} {showCodes}>
    <svelte:component this={GROUP_COMPONENTS[unit.groupType]} {unit} {entries} {advanced} {onView} />
  </DisplayOptions>
{:else if unit.kind === 'single'}
  <ResourceDisplay resource={unit.item.rh.resource} renderInfo={unit.item.renderInfo} {entries} {codeBadges} {showCodes} />
{:else}
  <!-- Group with no registered template: members have no standalone row, so show them individually -->
  {#each unit.members as member}
    <ResourceDisplay resource={member.rh.resource} renderInfo={member.renderInfo} {entries} {codeBadges} {showCodes} />
  {/each}
{/if}
