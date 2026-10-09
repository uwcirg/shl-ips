<script lang="ts">
  import { download } from '$lib/utils/util.js';
  import { createEventDispatcher } from 'svelte';
  import { derived, type Readable, type Writable } from 'svelte/store';
  import {
    Accordion,
    AccordionItem,
    Badge,
    Button,
    ButtonGroup,
    Card,
    CardBody,
    CardHeader,
    Col,
    FormGroup,
    Icon,
    Input,
    Offcanvas,
    Label,
    Row
  } from '@sveltestrap/sveltestrap';
  import { PLACEHOLDER_SYSTEM } from '$lib/config/config';
  import { ResourceHelper } from '$lib/utils/ResourceHelper.js';
  import type { ResourceCollection } from '$lib/utils/ResourceCollection.js';
  import { createCategorizedStore, type ResourceInput, type CategorizedResource } from '$lib/stores/categorizedResources';
  import ResourceRows from '$lib/components/app/ResourceRows.svelte';

  export let resourceCollection: ResourceCollection;
  export let scroll: boolean = true;
  export let submitting: boolean = false;
  export let sections: boolean | undefined = undefined;
  
  const statusDispatch = createEventDispatcher<{ 'status-update': string }>();
  const errorDispatch = createEventDispatcher<{ error: string }>();

  let reference: string;
  let selectedPatient = resourceCollection.selectedPatient;

  let resources = resourceCollection.resources;
  // Proxy for resourceCollection's resourcesByType to allow reactive updates
  let categorizerInput = derived(
    resources,
    ($resources) => {
      let input: ResourceInput = [];
      if ($resources) {
        let { sourceName } = resourceCollection.getTags();
        const isTestPatient = (rh: ResourceHelper) => 
          rh.resource.resourceType === 'Patient' && 
          rh.resource?.meta?.tag?.find(t => t.system === PLACEHOLDER_SYSTEM);
        let resources = Object.values($resources).filter(rh => !isTestPatient(rh));
        input.push({ source: sourceName, resources });
      }
      return input;
    }
  );
  
  const { store: categorizedResourceStore, getRenderInfo, sortResources } = createCategorizedStore(categorizerInput);

  let patientStore: Record<string, CategorizedResource>;
  let patientBadgeColor: string = 'danger';
  let patientCount: number = 0;
  $: patientStore = $categorizedResourceStore?.['Patient'];
  $: patientCount = patientStore ? Object.keys(patientStore).length : 0;
  $: patientBadgeColor = patientCount > 1 ? 'danger' : 'secondary';

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
  class="resource-json-offcanvas"
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


{#if $categorizedResourceStore}
  {@const allDataAsBundleEntries = Object.values($categorizedResourceStore).map(types => Object.values(types)).flat().map(cr => ({ resource: cr.rh.resource }))}
  {#if sections || sections === undefined && Object.keys($categorizedResourceStore).length > 1}
  <Accordion stayOpen class="w-100">
    {#each Object.keys($categorizedResourceStore) as category}
      {#if Object.keys($categorizedResourceStore[category]).length > 0}
        <AccordionItem class="resource-content {scroll ? 'scroll' : ''} resource-list-accordion" active={Object.keys($categorizedResourceStore[category]).length <= 3}>
          <span slot="header">
            {category}
            {#if category === 'Patients'}
              <Badge class="mx-1" color={patientBadgeColor}>
                {patientCount}
              </Badge>
            {:else}
              <Badge
                class="mx-1"
                color={Object.values($categorizedResourceStore[category]).filter(
                  (resource) => resource.rh.include
                ).length == Object.keys($categorizedResourceStore[category]).length
                  ? 'primary'
                  : Object.values($categorizedResourceStore[category]).filter(
                        (resource) => resource.rh.include
                      ).length == Object.keys($categorizedResourceStore[category]).length
                    ? 'primary'
                    : Object.values($categorizedResourceStore[category]).filter(
                          (resource) => resource.rh.include
                        ).length > 0
                      ? 'info'
                      : 'secondary'}
              >
                {Object.values($categorizedResourceStore[category]).filter(
                  (resource) => resource.rh.include
                ).length}
              </Badge>
            {/if}
          </span>
          <ResourceRows
            resources={Object.values($categorizedResourceStore[category]).sort(sortResources)}
            entries={allDataAsBundleEntries}
            on:view={({ detail }) => setJson(detail)}
          />
        </AccordionItem>
      {/if}
    {/each}
  </Accordion>
  {:else}
    <!-- All resources in one list, regardless of category -->
    {@const allResources = Object.values($categorizedResourceStore).flatMap((category) => Object.values(category).sort(sortResources))}
    {#if allResources.length > 0}
      <div
        class="resource-content bg-body border rounded p-3 w-100"
        style={scroll ? 'overflow: auto; max-height: 65vh' : ''}
      >
        <ResourceRows
          resources={allResources}
          entries={allDataAsBundleEntries}
          on:view={({ detail }) => setJson(detail)}
        />
      </div>
    {/if}
  {/if}
{/if}

<style>
  :global(div.resource-list-accordion:not(:has(div.accordion-collapse.show)) > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-light) !important;
  }
  :global(div.resource-list-accordion:has(div.accordion-collapse.collapsing) > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-accordion-active-bg) !important;
  }
  /* Bootstrap stacks offcanvases below modals, but this one can be opened from inside one (e.g. the
     import confirmation), so put it and its backdrop above them */
  :global(.offcanvas.resource-json-offcanvas) {
    z-index: 1060;
  }
  :global(body:has(.offcanvas.resource-json-offcanvas.show) .offcanvas-backdrop) {
    z-index: 1059;
  }
</style>