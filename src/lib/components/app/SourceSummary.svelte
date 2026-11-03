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
  // Whether the pills are showing. With a filter, selected sources are moved to the front each time
  // this becomes true and when the row is expanded or collapsed, but not while picking
  export let open = true;

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let loading;
  $: loading = fhirDataService.loading;
  let displaySourceNames = derived(colorMap, ($colorMap) => {
    return Array.from($colorMap.keys());
  });
  let frontSources = new Set<string>();
  const refreshSourceOrder = () => (frontSources = new Set(filters ? $filters.sources : []));
  $: if (open) refreshSourceOrder();
  // Selected sources as of the last refresh come first, right after "All"
  $: orderedSourceNames = [
    ...$displaySourceNames.filter((source) => frontSources.has(source)),
    ...$displaySourceNames.filter((source) => !frontSources.has(source))
  ];
</script>

{#if $displaySourceNames}
  <PillScroller class={className} loading={$loading} watch={[orderedSourceNames, $filters?.sources.size]}
    on:expand={refreshSourceOrder}
    on:collapse={refreshSourceOrder}
  >
    {#if filters}
      <SourcePill name="All" selected={$filters.sources.size === 0} on:click={filters.clearSources} />
    {/if}
    {#each orderedSourceNames as source (source)}
      <SourcePill
        name={source}
        color={$colorMap.get(source)}
        selected={filters ? $filters.sources.has(source) : undefined}
        on:click={() => filters?.toggleSource(source)}
      />
    {/each}
  </PillScroller>
{/if}
