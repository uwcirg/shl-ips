<script lang="ts">
  import { getContext } from 'svelte';
  import { Badge, Button, Card, CardBody, Collapse, Icon, Input, InputGroup } from '@sveltestrap/sveltestrap';
  import SourcePill from '$lib/components/app/SourcePill.svelte';
  import PillScroller from '$lib/components/app/PillScroller.svelte';
  import SourceSummary from '$lib/components/app/SourceSummary.svelte';
  import { categoryTitle, type createCategorizedStore } from '$lib/stores/categorizedResources';
  import { panelFilterCount, type ResourceFilterStore } from '$lib/stores/resourceFilters';

  let className = '';
  export { className as class };

  export let filters: ResourceFilterStore = getContext('resourceFilters');
  export let categorizedStore: ReturnType<typeof createCategorizedStore> = getContext('categorizedStore');
  // Pages already scoped to one section have nothing to choose between
  export let showSections = true;

  const unitsStore = categorizedStore.unitsStore;
  $: sectionNames = Object.keys($unitsStore).sort((a, b) => a.localeCompare(b));

  // The search bar is always visible; everything else sits in a panel that starts collapsed
  let panelOpen = false;
  const isActive = filters.isActive;
  $: activeCount = panelFilterCount($filters);
</script>

<div class={className}>
  <div class="d-flex gap-2">
    <Button
      color="primary"
      outline={!panelOpen}
      class="flex-shrink-0 d-inline-flex align-items-center gap-1 shadow-sm"
      aria-expanded={panelOpen}
      on:click={() => (panelOpen = !panelOpen)}
    >
      {#if activeCount > 0}
        <Badge color="danger" pill>{activeCount}</Badge>
      {:else}
        <Icon name="funnel" />
      {/if}
      Filters
      <Icon name="chevron-down" class="filter-chevron" style={panelOpen ? 'transform: rotate(180deg);' : ''} />
    </Button>
    <InputGroup class="shadow-sm">
      <Input
        type="search"
        placeholder="Search your health data"
        aria-label="Search your health data"
        value={$filters.text}
        on:input={(e) => filters.setText(e.currentTarget.value)}
      />
      {#if $filters.text}
        <Button color="secondary" outline aria-label="Clear search" on:click={() => filters.setText('')}>
          <Icon name="x-lg" />
        </Button>
      {/if}
    </InputGroup>
  </div>

  <Collapse isOpen={panelOpen}>
    <Card class="mt-3 mb-3 shadow-sm">
      <CardBody>
      <div class="d-flex align-items-center gap-2 mb-3">
        <h5 class="mb-0">Filters</h5>
        {#if $isActive}
          <Button
            color="danger"
            outline
            class="rounded-pill py-0 px-2 d-inline-flex align-items-center gap-1"
            on:click={filters.reset}
          >
            <Icon name="x" /> Clear all
          </Button>
        {/if}
      </div>
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
      </div>
      </CardBody>
    </Card>
  </Collapse>
</div>

<style>
  :global(.filter-chevron) {
    transition: transform 0.2s;
  }
</style>
