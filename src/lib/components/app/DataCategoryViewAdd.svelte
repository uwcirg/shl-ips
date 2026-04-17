<script lang="ts">
  import { Accordion,
    AccordionItem,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    CardFooter,
    Col,
    DropdownItem,
    DropdownMenu,
    Icon,
    Offcanvas,
    Row,
    Spinner,
    TabContent,
    TabPane
  } from '@sveltestrap/sveltestrap';
  import { createEventDispatcher, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { derived, get, writable, type Writable, type Readable } from 'svelte/store';
  import { METHOD_NAMES } from '$lib/config/config';
  import DatasetStatusLoader from '$lib/components/app/DatasetStatusLoader.svelte';
  import DatasetView from '$lib/components/app/DatasetView.svelte';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import FHIRResourceList from '$lib/components/app/FHIRResourceList.svelte';
  import type { DataFormConfig } from '$lib/utils/types';
  import type { ResourceCollection } from '$lib/utils/ResourceCollection';
  import { SvelteComponent } from 'svelte';

  const formDispatch = createEventDispatcher<{'show-form': {
    form: DataFormConfig,
    category: string
  }}>();

  // Top-level description
  export let title: string | SvelteComponent | undefined;
  export let description: string | undefined;
  
  export let category: string;
  
  export let forms: DataFormConfig[];
  
  export let submitting: boolean;
  export let currentTab: string;

  export let showAdd: boolean;

  export let activeTab: string;

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let userResources = fhirDataService.userResources;
  let loading = fhirDataService.loading;
  let masterPatient = fhirDataService.masterPatient;
  
  let mode: Writable<string> = getContext('mode');

  let datasets;
  $: datasets = $userResources?.[category]
    ? fhirDataService.getDatasetsForCategory(category)
    : [];
  
  let methodList: string[];
  let addDataActiveOnLoad = showAdd || !($userResources?.[category]);
  let accordionClass: string;
  $: if (forms) {
    methodList = forms.map(cat => cat.method);
    if (methodList?.length > 0) {
      accordionClass = "add-" + methodList[0];
    }
  }

  $: {
    if (activeTab) {
      document.querySelector(`span.${activeTab}-tab`)?.parentElement?.click();
    }
  }


  function showDataset(collection: ResourceCollection) {
    let { method, source, sourceName } = collection.getTags();
    let methodName = METHOD_NAMES[method]?.name;

    let sourceString = sourceName ?? "Unknown source";
    let methodString = methodName ? ` (${methodName})` : "";
    setContent(
      `${sourceString}${methodString}`,
      collection
    );
  }

  function updateDataset(collection: ResourceCollection) {
    let { method } = collection.getTags();
    // TODO: autofill source/data in form
    const accordionButton = document.querySelector(`div.${accordionClass} > h2 > button.accordion-button`);
    if (accordionButton) {
      const openCollapse = document.querySelector(`div.${accordionClass} > div.accordion-collapse.show`);
      if (openCollapse === null) {
        accordionButton.click();
      }
      const offset = 72;
      const elementTop = accordionButton.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({top: elementTop - offset-10, behavior: 'smooth'});
      activeTab = method;
    }
  }

  let isOpen = false;
  let name = '';
  let date = '';
  let ocCategory: Writable<string> = writable('');
  let ocMethod: Writable<string> = writable('');
  let ocSource: Writable<string> = writable('');
  let ocDataset: Readable<any> = derived(
    [userResources, ocCategory, ocMethod, ocSource], 
    ([$userResources, $ocCategory, $ocMethod, $ocSource]) => {
      if (!$userResources || !$ocCategory || !$ocMethod || !$ocSource) {
        return;
      }
      let dataset = $userResources?.[$ocCategory]?.[$ocMethod]?.[$ocSource];
      return dataset;
    }
  );
  function setContent(viewName: string, viewCollection: ResourceCollection) {
    let { category, method, source } = viewCollection.getTags();
    ocCategory.set(category);
    ocMethod.set(method);
    ocSource.set(source);
    name = viewName;
    date = new Date((get(viewCollection.patient)).meta.lastUpdated).toLocaleString(undefined, {
      dateStyle: "medium",
    })
    isOpen = true;
  }
  function toggle() {
    isOpen = !isOpen;
  }
</script>

<Offcanvas
  {isOpen}
  {toggle}
  scroll
  header={name}
  placement="end"
  title={name}
  style="display: flex; overflow-y:hidden; height: 100dvh; max-width: calc(2 * var(--bs-offcanvas-width)); width: 80dvw; min-width: var(--bs-offcanvas-width);"
>
  <div class="
      d-flex
      justify-content-between
      align-items-center
      flex-nowrap
      w-100
      p-2
      bg-light
      rounded-top
      border-top
      border-start
      border-end"
    style="height: 50px"
  >
    <div class="flex-shrink-0">
      <Icon name="calendar-check"/> {date}
    </div>
    <div class="ms-3 flex-shrink-0">
      <Button
        size="sm"
        color="secondary"
        outline
        on:click={() => {
          const accordionButtons = document.querySelectorAll(`div.resource-content:not(:has(div.accordion-collapse.show)) > h2 > button.accordion-button`);
          for (const accordionButton of Array.from(accordionButtons)) {
            accordionButton.click();
          }
        }}
      >
        Open All
      </Button>
      <Button
        size="sm"
        color="secondary"
        outline
        on:click={() => {
          const accordionButtons = document.querySelectorAll(`div.resource-content:has(div.accordion-collapse.show) > h2 > button.accordion-button`);
          for (const accordionButton of Array.from(accordionButtons)) {
            accordionButton.click();
          }
        }}
      >
        Collapse All
      </Button>
    </div>
  </div>
  <div class="d-flex w-100" style="height: calc(100% - 100px);">
    <Col class="d-flex pe-0 h-100 w-100" style="overflow: auto">
      {#if $ocDataset && isOpen}
        <DatasetStatusLoader status={$ocDataset.status} size="md">
          <div slot="loader" class="d-flex justify-content-center align-items-center w-100">
            <Spinner slot="loader" size="md" color="secondary" />
          </div>
          <FHIRResourceList
            resourceCollection={$ocDataset.collection}
            bind:submitting={submitting}
            scroll={false}
            on:status-update={ ({ detail }) => { /*updateStatus(detail)*/ } }
            on:error={ ({ detail }) => { /*showError(detail)*/ } }
          />
        </DatasetStatusLoader>
      {/if}
    </Col>
  </div>
  <Row class="d-flex pe-0" style="height: 50px">
    <Col class="d-flex justify-content-start align-items-end" style="padding-top: 1rem">
      <!-- <ButtonGroup>
        <Button
          size="sm"
          outline
          color="secondary"
          on:click={() => download(name + '.json', json)}
        >
          <Icon name="download" /> Download
        </Button>
      </ButtonGroup> -->
      <Button
        size="sm"
        outline
        color="secondary"
        on:click={() => { isOpen = false; updateDataset($ocDataset) }}
      >
        <Icon name="arrow-repeat" /> Update
      </Button>
    </Col>
    <Col class="d-flex justify-content-end align-items-end" style="padding-top: 1rem">
      <Button
        size="sm"
        outline
        color="danger"
        on:click={() => {
          isOpen = false;
          let {category, method, source} = $ocDataset.collection.getTags();
          // deleteDataset(category, method, source);
        }}
      >
        <Icon name="trash" /> Delete
      </Button>
    </Col>
  </Row>
</Offcanvas>

<Card id={category} class="my-3 p-2">
  <CardBody>
    <h5>
      {#if typeof title === 'string' }
        {title}
      {:else if title instanceof SvelteComponent}
        <svelte:component this={title}/>
      {/if}
    </h5>
    <Row>
      <Col class="d-flex justify-content-start" style="max-width: fit-content">
        {#if description}
          <p class="text-secondary mb-0"><em>{@html description}</em></p>
        {/if}
          <slot name="description"/>
      </Col>
    </Row>
    
    {#if (forms.length > 0 && ($mode === "advanced" || forms.filter(form => !form.advanced).length > 0))}
      <Row class="g-4 mt-0">
      {#each forms as formConfig, index}
        {#if $mode === "advanced" || !formConfig.advanced }
          <!-- Show the form -->
          <Col class={index === 0 ? "col-12" : ""}>
            <Button
              id={formConfig.method}
              class="h-100 w-100 d-flex align-items-top flex-column justify-content-between shadow"
              style="text-align: left;"
              outline
              color={ index === 0 ? "primary" : "secondary"}
              on:click={() => {
                goto(`/data/add/${category}/${formConfig.method}`);
                formDispatch('show-form', { category, form: formConfig });
              }}
            >
              <Row>
                <h5><strong>{formConfig.title ?? formConfig.tabTitle}{formConfig.advanced ? " *" : ""}</strong></h5>
                <!-- {#if formConfig.title}<h5 class="my-2">{formConfig.title}</h5>{/if} -->
                {#if formConfig.description}<span>{@html formConfig.description}</span>{/if}
              </Row>
              <Row>
                <Col class="d-flex justify-content-end">
                  <Icon name="chevron-right" />
                </Col>
              </Row>
            </Button>
          </Col>
        {/if}
      {/each}
      </Row>
    {/if}
    {#if $mode === "advanced" && forms.some(form => form.advanced)}
      <Row class="mt-3">
        <em class="text-secondary">* Advanced feature for demo purposes only</em>
      </Row>
    {/if}
  </CardBody>
</Card>

<style>
  :global(div.my-data-accordion > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-accordion-active-bg) !important;
  }
</style>
