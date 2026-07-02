<script lang="ts">
  import { download } from '$lib/utils/util.js';
  import { createEventDispatcher, getContext } from 'svelte';
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
  import ResourceDisplay from '$lib/components/app/ResourceDisplay.svelte';

  export let resourceCollection: ResourceCollection;
  export let scroll: boolean = true;
  export let submitting: boolean = false;
  
  const statusDispatch = createEventDispatcher<{ 'status-update': string }>();
  const errorDispatch = createEventDispatcher<{ error: string }>();

  let mode: Writable<string> = getContext('mode');

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
  <Accordion stayOpen class="w-100">
    {#if Object.keys($categorizedResourceStore).length > 0}
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
            {#each Object.values($categorizedResourceStore[category]).sort((a, b) => {
              let value = sortResources(a, b);
              return value;
            }) as value, index}
                <Row class={index > 0 ? "border-top pt-2 mt-2" : ""} style="overflow: hidden">
                  <Col class="overflow-auto justify-content-center align-items-center">
                    <ResourceDisplay resource={value} entries={Object.values($categorizedResourceStore)} />
                  </Col>
                  <Col class="d-flex justify-content-end align-items-center" style="max-width: fit-content">
                    {#if $mode === 'advanced'}
                      <Button
                        size="sm"
                        color="secondary"
                        outline
                        on:click={(event) => {
                          event.stopPropagation();
                          setJson(value)
                        }}
                      >
                        View
                      </Button>
                    {/if}
                  </Col>
                </Row>
            {/each}
          </AccordionItem>
        {/if}
      {/each}
    {/if}
  </Accordion>
{/if}

<style>
  :global(div.resource-list-accordion:not(:has(div.accordion-collapse.show)) > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-light) !important;
  }
  :global(div.resource-list-accordion:has(div.accordion-collapse.collapsing) > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-accordion-active-bg) !important;
  }
</style>