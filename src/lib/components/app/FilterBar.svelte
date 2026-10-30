<script lang="ts">
  import { getContext } from 'svelte';
  import { Card, CardBody, Collapse, Icon } from '@sveltestrap/sveltestrap';
  import FilterPanel from '$lib/components/app/FilterPanel.svelte';
  import FilterToggleButton from '$lib/components/app/FilterToggleButton.svelte';
  import type { createCategorizedStore } from '$lib/stores/categorizedResources';
  import { panelFilterCount, type ResourceFilterStore } from '$lib/stores/resourceFilters';

  let className = '';
  export { className as class };

  export let filters: ResourceFilterStore = getContext('resourceFilters');
  export let categorizedStore: ReturnType<typeof createCategorizedStore> = getContext('categorizedStore');
  // Pages already scoped to one section have nothing to choose between
  export let showSections = true;

  // The search bar is always visible; everything else sits in a panel that starts collapsed
  let panelOpen = false;
  $: activeCount = panelFilterCount($filters);
</script>

<div class={className}>
  <div class="d-flex gap-2">
    <FilterToggleButton open={panelOpen} count={activeCount} on:click={() => (panelOpen = !panelOpen)} />
    <!-- One box holding the icon, input and clear button, so they all read as part of the bar -->
    <div class="search-box shadow-sm">
      <Icon name="search" class="search-box-icon" />
      <input
        type="search"
        placeholder="Search your health data"
        aria-label="Search your health data"
        value={$filters.text}
        on:input={(e) => filters.setText(e.currentTarget.value)}
      />
      {#if $filters.text}
        <button type="button" class="search-box-clear" aria-label="Clear search" on:click={() => filters.setText('')}>
          <Icon name="x-lg" />
        </button>
      {/if}
    </div>
  </div>

  <Collapse isOpen={panelOpen}>
    <Card class="mt-3 mb-3 shadow-sm">
      <CardBody>
        <FilterPanel {filters} {categorizedStore} {showSections} on:done={() => (panelOpen = false)} />
      </CardBody>
    </Card>
  </Collapse>
</div>

<style>
  .search-box {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    min-width: 0;
    min-height: calc(1.5em + 0.75rem + 2px);
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius);
    background: var(--bs-body-bg);
  }
  .search-box:focus-within {
    border-color: #86b7fe;
    box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25) !important;
  }
  .search-box :global(.search-box-icon) {
    flex: 0 0 auto;
    padding: 0 0.5rem 0 0.75rem;
    color: var(--bs-secondary-color);
  }
  .search-box input {
    flex: 1;
    min-width: 0;
    align-self: stretch;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
  }
  .search-box-clear {
    flex: 0 0 auto;
    align-self: stretch;
    padding: 0 0.75rem;
    border: 0;
    background: none;
    color: var(--bs-secondary-color);
    cursor: pointer;
  }
</style>
