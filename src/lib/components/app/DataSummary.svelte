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
  import { createCategorizedStore, type CategoryMap } from '$lib/stores/categorizedResources';
  import ResourceDisplay from '$lib/components/app/ResourceDisplay.svelte';
  import ObservationSparkline from '$lib/components/app/ObservationSparkline.svelte';
  import { buildObservationSeriesMap, sparklineSeriesFor } from '$lib/utils/observationSparkline';
  import { derived, type Readable } from 'svelte/store';
  import { goto } from '$app/navigation';

  let colorMap = getContext<Writable<Map<string, string>>>('colorMap');
  
  export let categorizedStore: ReturnType<typeof createCategorizedStore> = getContext('categorizedStore');
  const categorizedResourceStore = categorizedStore.store;
  const getRenderInfo = categorizedStore.getRenderInfo;
  const sortResources = categorizedStore.sortResources;

  export let summary = false;
  export let categories: string[] = [];
  let categoryDataToDisplay: Readable<CategoryMap> = derived(
    categorizedResourceStore,
    ($categorizedResourceStore) => {
      if (categories.length === 0) {
        return $categorizedResourceStore;
      }
      let result: CategoryMap = {};
      categories.forEach(category => {
        if ($categorizedResourceStore[category]) {
          result[category] = $categorizedResourceStore[category];
        }
      });
      return result;
    }
  );
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
    {#if $categoryDataToDisplay[category] && Object.keys($categoryDataToDisplay[category]).length > 0}
      {@const values = Object.values($categoryDataToDisplay[category]).sort((a, b) => sortResources(a, b))}
      {@const valuesToDisplay = summary ? values.slice(0, 3) : values}
      {@const observationSeriesMap = buildObservationSeriesMap(values)}
      <CategoryView
        class="mb-4"
        title={category}
        summary={summary}
        seeAllFn={summary ? () => goto(`/data/manage/${category}`) : undefined}
        sortFields={['sourceName', 'category', 'method', 'source']}
        filterFields={['sourceName', 'category', 'method', 'source']}
      >
        <div slot="resources">
          {#each valuesToDisplay as value, index}
            {@const sourceName=getFriendlySourceNameBySource(value.source)}
            <Row class={(index > 0 ? "border-top pt-2 mt-2" : "") + " source-row"} style="overflow-x: clip; position: relative; flex-wrap: wrap;">
              <div
                class="ps-2 pe-4 tooltip-host"
                style="max-width: 0px; align-self: stretch;"
                style:--tooltip-color={$colorMap.get(sourceName)}
              >
                <div class="p-0 m-0 rounded h-100" style="max-width: 0px; border: .2rem solid {$colorMap.get(sourceName)}"></div>
              </div>
              <Col class="ps-0 overflow-auto justify-content-center align-items-center">
                <ResourceDisplay resource={value} entries={Object.values($categoryDataToDisplay)} />
              </Col>
              {@const sparklineSeries = sparklineSeriesFor(value, observationSeriesMap)}
              {#if sparklineSeries}
                <Col class="d-flex justify-content-center align-items-center" style="flex: 0 0 auto; max-width: fit-content">
                  <ObservationSparkline series={sparklineSeries} currentId={value.rh.tempId} />
                </Col>
              {/if}
              <Col class="d-flex justify-content-end align-items-center" style="max-width: fit-content">
                {#if $mode === 'advanced'}
                  <Button
                    size="sm"
                    color="secondary"
                    outline
                    on:click={(event) => {
                      event.stopPropagation();
                      setJson(value.rh)
                    }}
                  >
                    View
                  </Button>
                {/if}
              </Col>
              <Row class="ps-2 ms-0 pt-1">
                <div class="source-label" style:--tooltip-color={$colorMap.get(sourceName)}>
                  From {sourceName}
                </div>
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
