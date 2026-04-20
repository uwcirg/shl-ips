<script lang="ts">
  import { Badge, Button, Card, CardBody, Col, DropdownItem,
  DropdownMenu, Icon, Offcanvas, Row, Spinner } from '@sveltestrap/sveltestrap';
  import type { SOFAuthEvent, ResourceRetrieveEvent } from '$lib/utils/types';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { get, derived, type Readable, writable, type Writable } from 'svelte/store';
  import { getContext, onMount } from 'svelte';
  import DatasetStatusLoader from '$lib/components/app/DatasetStatusLoader.svelte';
  import DatasetView from '$lib/components/app/DatasetView.svelte';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import FHIRResourceList from '$lib/components/app/FHIRResourceList.svelte';
  import type { ResourceCollection } from '$lib/utils/ResourceCollection';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import { randomStringWithEntropy } from '$lib/utils/util';
  import StickyNavConfig from '$lib/components/layout/StickyNavConfig.svelte';
  import { METHOD_NAMES } from '$lib/config/config.js';
  
  export let data;
  let {category, method, categoryIndex, methodIndex} = data;
  let sections = INSTANCE_CONFIG.pages.data.sections;
  let form = sections[categoryIndex].forms[methodIndex];
  
  const hash = randomStringWithEntropy();
  const idSuffix = `${category}-${method}-${hash}`;

  const fhirDataService: FHIRDataService = getContext('fhirDataService');
  const userResources = fhirDataService.userResources;
  const loading = fhirDataService.loading;
  const masterPatient = fhirDataService.masterPatient;

  let datasets;
  $: datasets = $userResources?.[category]?.[method]
    ? fhirDataService.getDatasetsForCategoryAndMethod(category, method)
    : [];

  let resourceResult: ResourceRetrieveEvent;
  let fetchError: string;
  let successMessage: boolean;

  let formData: Writable<any | null> = writable(null);
  $: if (form && $userResources?.[category]?.[method]) {
    updateFormDataIfApplicable(form.method);
  }

  function setFormData(data: ResourceCollection | undefined) {
    if (data) {
      $formData = data;
    }
  }
  function updateFormDataIfApplicable(method: string) {
    if (!form.editable) {
      return;
    }
    let collectionsForMethod = fhirDataService.getAllResourceCollections().filter(collection => collection.getTags().method === method);
    setFormData(collectionsForMethod.length === 1 ? collectionsForMethod[0] : undefined);
  }

  onMount(() => {
    window.scrollTo({top: 1, behavior: 'instant'})
  });

  function preAuthRedirectHandler(details: SOFAuthEvent|undefined) {
    let url = $page.url.href.split('#')[0];
    sessionStorage.setItem('URL', url);
  }
  async function revertPreAuth(details: SOFAuthEvent|undefined) {
    sessionStorage.removeItem('URL');
  }

  async function handleNewResources(details: ResourceRetrieveEvent) {
    try {
      resourceResult = details;
      if (resourceResult.resources?.length) {
        // Trigger update in ResourceSelector
        await fhirDataService.addOrReplaceDataset(resourceResult);
        showSuccessMessage();
      }
    } catch (e) {
      console.log('Failed', e);
      fetchError = "Error preparing IPS";
    }
  }

  function updateDataset(collection: ResourceCollection) {
    const elementTop = document.getElementById(`form-${idSuffix}`)?.getBoundingClientRect().top;
    const offset = 72;
    window.scrollTo({top: (elementTop ?? 0) - offset-10, behavior: 'smooth'});
  }

  function deleteDataset(category: string, method: string, source: string) {
    fhirDataService.deleteDataset(category, method, source);
    updateFormDataIfApplicable(method);
  }

  async function showSuccessMessage() {
    successMessage = true;
    setTimeout(() => {
      successMessage = false;
    }, 1000);
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
<StickyNavConfig
  showBack={true}
  backLabel="Back to data types"
  onBack={() => goto(`/data#${category}`)}
  showForward={Object.keys($userResources).length > 0}
  forwardLabel="Review your data"
  onForward={() => goto(`/data/manage`)}
/>
{#if !form}
  Loading...
{:else if form.component}
  <Row id={`back-button-${idSuffix}`} class="mb-3">
    <Col>
      <Button size="sm" color="secondary" outline on:click={() => goto(`/data#${category}`)}><Icon name="chevron-left" /> Back to data types</Button>
    </Col>
  </Row>
  <h4>{form.title ?? form.tabTitle}</h4>
  <Card id={`form-${idSuffix}`}>
    <CardBody>
      <Row class="mb-3">
        <Col>
          {#if form.description}
            <p class="text-secondary mb-0"><em>{@html form.description}</em></p>
          {/if}
        </Col>
      </Row>
      <svelte:component
        this={form.component}
        disabled={$loading}
        formData={$formData}
        on:sof-auth-init={ async ({ detail }) => { preAuthRedirectHandler(detail) } }
        on:sof-auth-fail={ async ({ detail }) => { revertPreAuth(detail) }}
        on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
      />
    </CardBody>
  </Card>
  {#if $userResources?.[category]?.[method] && !form.editable}
    <h4 class="mt-3">Data you've added</h4>
    <Row class="g-4 d-flex justify-content-start">
      {#each datasets as dataset}
        {@const {method, source} = dataset.collection.getTags()}
        {@const {status, collection} = dataset}
        <Col xs="12" sm="6" lg="4" style="">
          <DatasetView {dataset} {masterPatient}>
            <DropdownMenu slot="menu">
              <DropdownItem on:click={() => showDataset(collection)}><div class="d-flex justify-content-between w-100">View <Icon name="chevron-right"/></div></DropdownItem>
              {#if form.editable}
                <DropdownItem class="text-primary"on:click={() => updateDataset(collection)}><Icon name="pencil"/> Edit</DropdownItem>
              {:else}
                <DropdownItem class="text-primary"on:click={() => updateDataset(collection)}><Icon name="arrow-repeat"/> Update</DropdownItem>
              {/if}
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
  {/if}
{/if}

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
            submitting={false}
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