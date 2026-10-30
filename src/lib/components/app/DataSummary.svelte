<script lang="ts">
  import { download } from '$lib/utils/util.js';
  import { createEventDispatcher, getContext, onDestroy } from 'svelte';
  import { type Writable } from 'svelte/store';
  import {
    Button,
    ButtonGroup,
    Col,
    Icon,
    Offcanvas,
    Row
  } from '@sveltestrap/sveltestrap';
  import { ResourceHelper } from '$lib/utils/ResourceHelper.js';
  import CategoryView from '$lib/components/app/CategoryView.svelte';
  import {getFriendlySourceNameBySource} from '$lib/utils/resourceCollectionUtils';
  import { createCategorizedStore, categoryTitle, type UnitMap, defaultResourceConfig } from '$lib/stores/categorizedResources';
  import { isUtilityResourceType } from '$lib/config/resource_config';
  import { unitItems, type DisplayUnit } from '$lib/stores/displayUnits';
  import { createFilterStore, filterUnits, warmSearchText, type ResourceFilterStore } from '$lib/stores/resourceFilters';
  import UnitDisplay from '$lib/components/app/UnitDisplay.svelte';
  import StickyFilters from '$lib/components/app/StickyFilters.svelte';
  import SectionNav, { type SectionNavItem } from '$lib/components/layout/SectionNav.svelte';
  import { derived, type Readable } from 'svelte/store';
  import { goto } from '$app/navigation';

  let colorMap = getContext<Writable<Map<string, string>>>('colorMap');
  
  export let categorizedStore: ReturnType<typeof createCategorizedStore> = getContext('categorizedStore');
  // Units (single resources or groups) are already grouped and sorted by the store
  const unitsStore = categorizedStore.unitsStore;
  const referenceIndex = categorizedStore.referenceIndex;

  // Pages without filtering get a store nothing writes to, which filters nothing
  const contextFilters: ResourceFilterStore | undefined = getContext('resourceFilters');
  export let filters: ResourceFilterStore = contextFilters ?? createFilterStore();
  const filtersActive = filters.isActive;

  let mode: Writable<string> = getContext('mode');

  export let summary = false;
  export let categories: string[] = [];
  // Float the compact filters once the main filter bar has scrolled away. Without a filter
  // context there is nothing to float.
  export let stickyFilters = !!contextFilters;
  let filtersStuck = false;

  // Build the search text in idle time so the first search isn't slow. Restarts as data loads.
  let cancelWarm: (() => void) | undefined;
  $: {
    cancelWarm?.();
    cancelWarm = contextFilters ? warmSearchText($unitsStore, { index: $referenceIndex }) : undefined;
  }
  onDestroy(() => cancelWarm?.());

  // Utility resources (Practitioner, Organization, ...) are not listed on their own except in
  // advanced mode. Resources inside a group still show, as part of it.
  const withoutUtilityResources = (units: DisplayUnit[], advanced: boolean) =>
    advanced
      ? units
      : units.filter((unit) => unit.kind !== 'single' || !isUtilityResourceType(unit.item.rh.resource.resourceType));

  let categoryDataToDisplay: Readable<UnitMap> = derived(
    [unitsStore, categorizedStore.referenceIndex, filters, mode],
    ([$unitsStore, $referenceIndex, $filters, $mode]) => {
      const advanced = $mode === 'advanced';
      const filtered = filterUnits($unitsStore, $filters, { index: $referenceIndex });
      let result: UnitMap = {};
      const add = (category: string) => {
        const units = withoutUtilityResources(filtered[category] ?? [], advanced);
        if (units.length > 0) result[category] = units;
      };
      if (categories.length === 0) {
        // No categories prop: show all categories, alphabetical by name
        Object.keys(filtered)
          .sort((a, b) => a.localeCompare(b))
          .forEach(add);
        return result;
      }
      // Passed categories prop: keep the order the parent provided
      categories.forEach(add);
      return result;
    }
  );

  // Categories that have something to show, in display order
  $: shownCategories = Object.keys($categoryDataToDisplay ?? {}).filter(
    (category) => $categoryDataToDisplay[category]?.length > 0
  );
  const categoryTitle = (category: string) =>
    Object.values(defaultResourceConfig).find(
      (cr) => cr.category === category || cr.categoryRules?.some((rule: { category: string }) => rule.category === category)
    ) ? category : `${category}s`;

  // Each category's title element, for the section nav to scroll to
  let titleEls: Record<string, HTMLElement | undefined> = {};
  $: navSections = shownCategories.map((category): SectionNavItem => ({
    title: categoryTitle(category),
    element: titleEls[category]
  }));

  // Friendly names come from a memo that fills in as collections load, in step with colorMap.
  // Callers pass $colorMap so rows recompute when it changes instead of keeping a stale raw name.
  const unitSourceNames = (unit: DisplayUnit, _colorMap?: Map<string, string>) => [
    ...new Set(unitItems(unit).map(item => getFriendlySourceNameBySource(item.source)))
  ];
  const NEUTRAL_COLOR = '#6c757d';
  const colorOf = (name: string, colors: Map<string, string>) => colors.get(name) ?? NEUTRAL_COLOR;
  // Vertical bar split evenly between the sources a unit draws from
  function sourceGradient(names: string[], colors: Map<string, string>) {
    const step = 100 / names.length;
    const stops = names.map((name, i) => `${colorOf(name, colors)} ${i * step}% ${(i + 1) * step}%`);
    return `linear-gradient(to bottom, ${stops.join(', ')})`;
  }
  export let submitting: boolean = false;
  
  const statusDispatch = createEventDispatcher<{ 'status-update': string }>();
  const errorDispatch = createEventDispatcher<{ error: string }>();

  let json = '';
  let resourceType = '';
  let isOpen = false;
  function setJson(rh: ResourceHelper) {
    json = JSON.stringify(rh.resource, null, 2);
    resourceType = rh.resource.resourceType;
    isOpen = true;
  }
  function toggle() {
    isOpen = !isOpen;
  }
</script>
<Offcanvas
  {isOpen}
  {toggle}
  scroll={false}
  header={resourceType + ' JSON'}
  placement="end"
  title={resourceType + ' JSON'}
  style="display: flex;  overflow-y:hidden; height: 100dvh; width: fit-content; max-width: 80dvw; min-width: var(--bs-offcanvas-width);"
>
  <Row class="d-flex" style="height: 100%">
    <Row class="d-flex pe-0" style="height:calc(100% - 50px)">
      <Col class="d-flex pe-0" style="height:100%">
        <div class="d-flex pe-0 pb-0 code-container w-100">
          <pre class="code"><code>{json}</code></pre>
        </div>
      </Col>
    </Row>
    <Row class="d-flex pe-0" style="height:50px">
      <Col class="d-flex justify-content-start align-items-end" style="padding-top: 1rem">
        <ButtonGroup>
          <Button size="sm" color="primary" on:click={() => navigator.clipboard.writeText(json)}
            ><Icon name="clipboard" /> Copy</Button
          >
          <Button
            size="sm"
            outline
            color="secondary"
            on:click={() => download(resourceType + '.json', json)}
          >
            <Icon name="download" /> Download
          </Button>
        </ButtonGroup>
      </Col>
    </Row>
  </Row>
</Offcanvas>


{#if $categoryDataToDisplay && Object.keys($categoryDataToDisplay).length > 0}
  <!-- One block spanning the whole list, so the filters' sticky anchor stays put until the list ends -->
  <div>
  {#if stickyFilters}
    <StickyFilters {filters} {categorizedStore} showSections={categories.length === 0} withNav={shownCategories.length > 1} bind:stuck={filtersStuck} />
  {/if}
  <div class="category-layout" class:with-nav={shownCategories.length > 1}>
  {#if shownCategories.length > 1}
    <SectionNav sections={navSections} label="Categories" inset={filtersStuck} />
  {/if}
  <div class="category-list">
  <!-- Keyed by category: categories can appear in the middle of the list as data loads, and an
       unkeyed block would reuse instances, leaving the title element bound under the wrong key -->
  {#each Object.keys($categoryDataToDisplay) as category (category)}
    {#if $categoryDataToDisplay[category] && $categoryDataToDisplay[category].length > 0}
      {@const units = $categoryDataToDisplay[category]}
      <!-- Filtering shows every match in every section, so only truncate when unfiltered -->
      {@const truncate = summary && !$filtersActive}
      {@const unitsToDisplay = truncate ? units.slice(0, 5) : units}
      <!-- Entries come from the unfiltered units so references still resolve -->
      {@const valuesAsBundleEntries = ($unitsStore[category] ?? units).flatMap(unitItems).map((item) => ({ resource: item.rh.resource }))}
      {@const totalOthers = units.length - unitsToDisplay.length}
      <div id={`${category}`}></div>
      <CategoryView
        class="mb-4"
        title={categoryTitle(category)}
        bind:titleElement={titleEls[category]}
        seeAllFn={truncate ? () => goto(`/data/manage/${category}`) : undefined}
      >
        <div slot="resources">
          {#each unitsToDisplay as unit, index}
            {@const sourceNames = unitSourceNames(unit, $colorMap)}
            {@const sourceName = sourceNames[0]}
            <Row class={(index > 0 ? "border-top pt-2 mt-2" : "") + " source-row"} style="overflow-x: clip; position: relative; flex-wrap: wrap;">
              <div
                class="ps-2 pe-4 tooltip-host d-flex"
                style="max-width: 0px; align-self: stretch;"
                style:--tooltip-color={colorOf(sourceName, $colorMap)}
              >
                <!-- A flex item, so it stretches to the row's height without relying on percentage heights -->
                <div
                  class="source-bar rounded"
                  style:background={sourceNames.length > 1 ? sourceGradient(sourceNames, $colorMap) : colorOf(sourceName, $colorMap)}
                ></div>
              </div>
              <Col class="ps-0 resource-content overflow-auto justify-content-center align-items-center">
                <UnitDisplay {unit} entries={valuesAsBundleEntries} advanced={$mode === 'advanced'} onView={setJson} />
              </Col>
              <Col class="d-flex justify-content-end align-items-center" style="max-width: fit-content">
                {#if $mode === 'advanced' && unit.kind === 'single'}
                  <Button
                    size="sm"
                    color="secondary"
                    outline
                    on:click={(event) => {
                      event.stopPropagation();
                      setJson(unit.item.rh)
                    }}
                  >
                    View
                  </Button>
                {/if}
              </Col>
              <Row class="ps-2 ms-0 pt-1">
                {#each sourceNames as name}
                  <div class="source-label" style:--tooltip-color={colorOf(name, $colorMap)}>
                    From {name}
                  </div>
                {/each}
              </Row>
            </Row>
          {/each}
          {#if totalOthers > 0}
            <Row class={"border-top px-2 pt-3 mt-2 source-row"} style="overflow-x: clip; position: relative; flex-wrap: wrap;">
              <Button class="w-100 py-2" style="--bs-btn-border-color: var(--bs-border-color);" outline size="sm" color="secondary" on:click={() => goto(`/data/manage/${category}`)}>
                See all {units.length} <Icon name="chevron-right" />
              </Button>
            </Row>
          {/if}
        </div>
      </CategoryView>
    {/if}
  {/each}
  </div>
  </div>
  </div>
{:else if $filtersActive}
  <div class="text-center text-secondary py-4">
    <p class="mb-2">No data matches the current filters.</p>
    <Button size="sm" color="secondary" outline on:click={filters.reset}>Clear filters</Button>
  </div>
{/if}

<style>
  .category-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
  }
  /* The SectionNav column; the nav itself is shown from md up */
  @media (min-width: 768px) {
    .category-layout.with-nav {
      grid-template-columns: 13rem minmax(0, 1fr);
    }
  }
  .category-list {
    min-width: 0;
  }

  :global(div.resource-list-accordion:not(:has(div.accordion-collapse.show)) > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-light) !important;
  }
  :global(div.resource-list-accordion:has(div.accordion-collapse.collapsing) > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-accordion-active-bg) !important;
  }

  .source-bar {
    flex: 0 0 0.4rem;
    width: 0.4rem;
    align-self: stretch;
    min-height: 1rem;
  }

  .source-label {
    flex-basis: 100%;
    font-size: 0.75rem;
    color: #fff;
    background: var(--tooltip-color, #333);
    border-radius: 4px;
    padding: 0;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.15s, padding 0.15s, opacity 0.15s;
    white-space: nowrap;
    flex-basis: 100%;
    align-self: flex-start;
    max-width: fit-content;
  }
  
  :global(.source-row:has(.tooltip-host:hover)) .source-label {
    max-height: 2rem;
    padding: 0.25rem 0.5rem;
    opacity: 1;
  }
  
  :global(.source-row) {
    transition: padding-bottom 0.15s;
  }
</style>
