<script lang="ts">
  import { getContext } from 'svelte';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import PillScroller from '$lib/components/app/PillScroller.svelte';
  import SourcePill from '$lib/components/app/SourcePill.svelte';
  import type { ResourceFilterStore } from '$lib/stores/resourceFilters';
  import { derived, type Writable } from 'svelte/store';

  const colorMap = getContext<Writable<Map<string, string>>>('colorMap');

  let className = '';
  export { className as class };

  // When given, pills toggle their source in the filter; with none selected, all sources show
  export let filters: ResourceFilterStore | undefined = undefined;

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let loading;
  $: loading = fhirDataService.loading;
  let displaySourceNames = derived(colorMap, ($colorMap) => {
    return Array.from($colorMap.keys());
  });
</script>

{#if $displaySourceNames}
  <PillScroller class={className} loading={$loading} watch={[$displaySourceNames, $filters?.sources.size]}>
    {#if filters}
      <SourcePill name="All" selected={$filters.sources.size === 0} on:click={filters.clearSources} />
    {/if}
    {#each $displaySourceNames as source}
      <SourcePill
        name={source}
        color={$colorMap.get(source)}
        selected={filters ? $filters.sources.has(source) : undefined}
        on:click={() => filters?.toggleSource(source)}
      />
    {/each}
  </PillScroller>
{/if}
