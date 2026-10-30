<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import { Button, Icon, Input } from '@sveltestrap/sveltestrap';
  import SourcePill from '$lib/components/app/SourcePill.svelte';
  import PillScroller from '$lib/components/app/PillScroller.svelte';
  import SourceSummary from '$lib/components/app/SourceSummary.svelte';
  import { categoryTitle, type createCategorizedStore } from '$lib/stores/categorizedResources';
  import type { ResourceFilterStore } from '$lib/stores/resourceFilters';

  // The filter controls themselves (sources, sections, dates), without a container, so they can sit
  // in the page's collapsible card or in the dropdown shown while the page is scrolled. Both bind
  // to the same store, so they always show the same selections.
  export let filters: ResourceFilterStore = getContext('resourceFilters');
  export let categorizedStore: ReturnType<typeof createCategorizedStore> = getContext('categorizedStore');
  // Pages already scoped to one section have nothing to choose between
  export let showSections = true;

  const unitsStore = categorizedStore.unitsStore;
  $: sectionNames = Object.keys($unitsStore).sort((a, b) => a.localeCompare(b));
  const isActive = filters.isActive;

  // The host (card or dropdown) closes itself on this
  const dispatch = createEventDispatcher<{ done: void }>();
</script>

<h5 class="mb-3">Filters</h5>
<h6 class="mb-1">Sources</h6>
<SourceSummary class="mb-3" {filters} />

{#if showSections}
  <h6 class="mb-1">Sections</h6>
  <PillScroller class="mb-3" watch={[sectionNames, $filters.sections.size]}>
    <SourcePill name="All" selected={$filters.sections.size === 0} on:click={filters.clearSections} />
    {#each sectionNames as section (section)}
      <SourcePill
        name={categoryTitle(section)}
        selected={$filters.sections.has(section)}
        on:click={() => filters.toggleSection(section)}
      />
    {/each}
  </PillScroller>
{/if}

<h6 class="mb-1">Dates</h6>
<div class="d-flex flex-wrap align-items-center gap-2">
  <Input
    type="date"
    class="w-auto"
    aria-label="From date"
    value={$filters.dateFrom}
    max={$filters.dateTo || undefined}
    on:input={(e) => filters.setDateRange(e.currentTarget.value, $filters.dateTo)}
  />
  <span class="text-secondary">to</span>
  <Input
    type="date"
    class="w-auto"
    aria-label="To date"
    value={$filters.dateTo}
    min={$filters.dateFrom || undefined}
    on:input={(e) => filters.setDateRange($filters.dateFrom, e.currentTarget.value)}
  />
  {#if $filters.dateFrom || $filters.dateTo}
    <Button
      size="sm"
      color="secondary"
      outline
      class="rounded-circle d-inline-flex align-items-center justify-content-center"
      style="width: 2rem; height: 2rem; padding: 0;"
      aria-label="Clear dates"
      on:click={filters.clearDates}
    >
      <Icon name="x-lg" />
    </Button>
  {/if}
  <div class="ms-auto d-flex align-items-center gap-2">
    {#if $isActive}
      <Button color="danger" outline on:click={filters.reset}>Clear all</Button>
    {/if}
    <Button color="primary" on:click={() => dispatch('done')}>Done</Button>
  </div>
</div>
