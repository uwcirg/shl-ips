<script lang="ts">
  import { Accordion,
    AccordionItem,
    Badge,
    Button,
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
  import { goto } from '$app/navigation';
  import { getContext } from 'svelte';
  import { derived, get, writable, type Writable, type Readable } from 'svelte/store';
  import { METHOD_NAMES } from '$lib/config/config';
  import DatasetStatusLoader from '$lib/components/app/DatasetStatusLoader.svelte';
  import DatasetView from '$lib/components/app/DatasetView.svelte';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import FHIRResourceList from '$lib/components/app/FHIRResourceList.svelte';
  import InfoButton from '$lib/components/app/InfoButton.svelte';
  import type { DataFormConfig } from '$lib/utils/types';
  import type { ResourceCollection } from '$lib/utils/ResourceCollection';

  export let id: string;

  // Title
  export let title: string;
  // Top-level description
  export let description: string | undefined;
  export let info: string | undefined;
  
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
  let formData: Writable<Record<string, any | null>> = writable({});
  $: if (forms && $userResources?.[category]) {
    forms.forEach(form => {
      updateFormDataIfApplicable(form.method);
    });
  }

  function formForMethod(method: string) {
    return forms.find(form => form.method === method);
  }

  function formIsEditable(method: string) {
    return formForMethod(method)?.editable;
  }
  
  function updateFormDataIfApplicable(method: string) {
    if (!formIsEditable(method)) {
      return;
    }
    let collectionsForMethod = fhirDataService.getAllResourceCollections().filter(collection => collection.getTags().method === method);
    setFormData(method, collectionsForMethod.length === 1 ? collectionsForMethod[0] : undefined);
  }

  $: {
    if (activeTab) {
      document.querySelector(`span.${activeTab}-tab`)?.parentElement?.click();
    }
  }

  function setFormData(method: string, data: ResourceCollection | undefined) {
    if (data) {
      $formData[method] = data;
    } else {
      delete $formData[method];
    }
    $formData = $formData;
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

  function deleteDataset(category: string, method: string, source: string) {
    fhirDataService.deleteDataset(category, method, source);
    updateFormDataIfApplicable(method);
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
          deleteDataset(category, method, source);
        }}
      >
        <Icon name="trash" /> Delete
      </Button>
    </Col>
  </Row>
</Offcanvas>

{#if description}
  <p class="text-secondary"><em>{@html description}</em></p>
{/if}
<slot name="description"/>
{#if $userResources?.[category] && methodList?.length > 0 }
  <Row class="g-4 d-flex justify-content-start">
    {#each datasets as dataset}
      {@const {method, source} = dataset.collection.getTags()}
      {@const {status, collection} = dataset}
      <Col xs="12" sm="6" lg="4" style="">
        <DatasetView {dataset} {masterPatient}>
          <DropdownMenu slot="menu">
            <DropdownItem on:click={() => showDataset(collection)}><div class="d-flex justify-content-between w-100">View <Icon name="chevron-right"/></div></DropdownItem>
            <DropdownItem class="text-primary"on:click={() => updateDataset(collection)}><Icon name="arrow-repeat"/> Update</DropdownItem>
            <DropdownItem divider />
            <DropdownItem class="text-danger" on:click={() => deleteDataset(category, method, source)}><Icon name="trash"/> Delete</DropdownItem>
          </DropdownMenu>
          <Button slot="footer" class="d-flex justify-content-between align-items-center" color="secondary" outline on:click={() => showDataset(collection)}>
            <div class="d-flex align-items-center" style="min-width: 37px">
              <DatasetStatusLoader {status}>
                <Badge color="primary">{collection.getResourceCount()}</Badge>
              </DatasetStatusLoader>
            </div>
            <div>View </div>
            <Icon name="chevron-right"/>
          </Button>
        </DatasetView>
      </Col>
    {/each}
  </Row>
{:else}
  <Button color="primary" on:click={() => goto(`/data#${id}`)}><Icon name="chevron-left"/> Add {title}</Button>
{/if}

<style>
  :global(div.my-data-accordion > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-accordion-active-bg) !important;
  }
</style>
