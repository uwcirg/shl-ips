<script lang="ts">
  import { download } from '$lib/utils/util.js';
  import { createEventDispatcher, getContext } from 'svelte';
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
  import { createCategorizedStore, type UnitMap, defaultResourceConfig } from '$lib/stores/categorizedResources';
  import type { DisplayUnit } from '$lib/stores/displayUnits';
  import UnitDisplay from '$lib/components/app/UnitDisplay.svelte';
  import { derived, type Readable } from 'svelte/store';
  import { goto } from '$app/navigation';

  let colorMap = getContext<Writable<Map<string, string>>>('colorMap');
  
  export let categorizedStore: ReturnType<typeof createCategorizedStore> = getContext('categorizedStore');
  // Units (single resources or groups) are already grouped and sorted by the store
  const unitsStore = categorizedStore.unitsStore;

  export let summary = false;
  export let categories: string[] = [];
  let categoryDataToDisplay: Readable<UnitMap> = derived(
    unitsStore,
    ($unitsStore) => {
      if (categories.length === 0) {
        return $unitsStore;
      }
      let result: UnitMap = {};
      categories.forEach(category => {
        if ($unitsStore[category]) {
          result[category] = $unitsStore[category];
        }
      });
      return result;
    }
  );

  const unitItems = (unit: DisplayUnit) => unit.kind === 'single' ? [unit.item] : unit.members;
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

  let mode: Writable<string> = getContext('mode');

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
  {#each Object.keys($categoryDataToDisplay) as category}
    {#if $categoryDataToDisplay[category] && $categoryDataToDisplay[category].length > 0}
      {@const units = $categoryDataToDisplay[category]}
      {@const unitsToDisplay = summary ? units.slice(0, 3) : units}
      {@const valuesAsBundleEntries = units.flatMap(unitItems).map((item) => ({ resource: item.rh.resource }))}
      <div id={`${category}`}></div>
      <CategoryView
        class="mb-4"
        title={Object.values(defaultResourceConfig).find((cr) => cr.category === category) ? category : `${category}s`}
        summary={summary}
        seeAllFn={summary ? () => goto(`/data/manage/${category}`) : undefined}
        sortFields={['sourceName', 'category', 'method', 'source']}
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
        </div>
      </CategoryView>
    {/if}
  {/each}
{/if}

<style>
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
