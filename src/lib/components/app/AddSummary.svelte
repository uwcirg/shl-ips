<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getContext } from 'svelte';
  import { get, derived, writable, type Writable, type Readable } from 'svelte/store';
  import {
    Accordion,
    AccordionItem,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    Col,
    DropdownItem,
    DropdownMenu,
    FormGroup,
    Icon,
    Input,
    Label,
    Offcanvas,
    Row,
    Spinner,
  } from '@sveltestrap/sveltestrap';
  import { DATA_CATEGORY_NAMES, METHOD_NAMES, METHOD_SYSTEM } from '$lib/config/config';
  import ResourceSelector from '$lib/components/app/ResourceSelector.svelte';
  import {
    getResourcesFromIPS,
    isSHCFile,
    packageSHC,
  } from '$lib/utils/util';
  import { verify } from '$lib/utils/shcDecoder.js';
  import type {
    SHCFile,
    SHCRetrieveEvent,
    ResourceRetrieveEvent,
    IPSRetrieveEvent,
    SHLSubmitEvent, 
    SOFAuthEvent
  } from '$lib/utils/types';
  import { IPSResourceCollection } from '$lib/utils/IPSResourceCollection.js';
  import FHIRResourceList from '$lib/components/app/FHIRResourceList.svelte';
  import type FHIRDataService from '$lib/utils/FHIRDataService';
  import Patient from '$lib/components/resource-templates/Patient.svelte';
  import { PLACEHOLDER_SYSTEM } from '$lib/config/config';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import { methodSectionHelper } from '$lib/utils/sectionTemplateUtil';
  import DatasetStatusLoader from '$lib/components/app/DatasetStatusLoader.svelte';
  import DatasetView from '$lib/components/app/DatasetView.svelte';
  import { ResourceCollection } from '$lib/utils/ResourceCollection';
 
  export let status = "";
  
  let shlIdParam = $page.url.searchParams.get('shlid');

  const shlDispatch = createEventDispatcher<{ 'shl-submitted': SHLSubmitEvent }>();
  let submitting = false;
  let fetchError = "";
  let currentTab: string | number = 'default';
  let emptyResourceListHeader = "Retrieve Your Health Information";
  let fullResourceListHeader = "1. Add information from another provider"
  let addDataHeader = emptyResourceListHeader;
  let successMessage = false;

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let masterPatient = fhirDataService.masterPatient;
  let userResources = fhirDataService.userResources;
  
  let mode: Writable<string> = getContext('mode');

  let resourceResult: ResourceRetrieveEvent = {
    resources: undefined
  }
  let shcResult: SHCRetrieveEvent = {
    shc: undefined
  }
  let ipsResult: IPSRetrieveEvent = {
    ips: undefined
  }

  let shcsToAdd: SHCFile[] = [];
  let singleIPS = true;
  let patientName = "";
  let patient: Patient | undefined;

  let label = 'Health Summary ' + new Date().toLocaleDateString();
  let expiration: number | null = -1;
  let type = 'password';
  let showPassword = false;
  let passcode = "";

  let resourceCollection: IPSResourceCollection = new IPSResourceCollection();
  let resourcesByTypeStore;
  $: resourcesByTypeStore = resourceCollection.resourcesByType;
  let resourcesAdded = false;
  $: {
    if ($resourcesByTypeStore) {
      let oldvalue = resourcesAdded;
      resourcesAdded = Object.keys($resourcesByTypeStore).length > 0;
      if (!oldvalue && resourcesAdded) {
        setTimeout(() => document.querySelector('#select-data')?.scrollIntoView({block: 'center'}), 10);
        // Prevent flash of AddData accordion overflow when first resources are added
        handleAddDataAccordionOverflow('add-data');
      }
    }
  }

  let userUpdatedLabel = false;
  $: {
    if (resourceCollection.patient) {
      patient = resourceCollection.getSelectedPatient();
    }
  }

  $: type = showPassword ? 'text' : 'password';
  $: icon = showPassword ? 'eye-fill' : 'eye-slash-fill';
  $: addDataHeader = resourcesAdded ? fullResourceListHeader : emptyResourceListHeader;
  $: {
    if (patient?.name?.[0].given) {
      patientName = patient.name[0]?.given[0];
    }
  }
  $: {
    if (!userUpdatedLabel) {
      if (patientName) {
        label = patientName.charAt(0).toUpperCase() + patientName.slice(1).toLowerCase() + "'s";
      } else {
        label = "My";
      }
      label = label + " Summary Link " + new Date().toLocaleDateString();
    }
  }
  $: {
    if ($mode === 'normal') {
      setTimeout(() => document.querySelector(`span.default-tab`)?.parentElement?.click(), 1); 
    }
  }

  onMount(async function() {
    if (sessionStorage.getItem('URL')) {
      let url = sessionStorage.getItem('URL') ?? '/share';
      let currentUrl = window.location.href.split('?')[0];
      sessionStorage.removeItem('URL');
      if (url !== currentUrl) {
        return goto(url);
      }
    }
    currentTab = sessionStorage.getItem('TAB') ?? currentTab;
    label = sessionStorage.getItem('LABEL') ?? label;
    passcode = sessionStorage.getItem('PASSCODE') ?? passcode;
    if (sessionStorage.getItem('RESOURCES')) {
      resourceCollection = IPSResourceCollection.fromJson(sessionStorage.getItem('RESOURCES') ?? "")
    }
    if (sessionStorage.getItem('PATIENT')) {
      patient = JSON.parse(sessionStorage.getItem('PATIENT') ?? "") ?? patient;
    }
    if (sessionStorage.getItem('EXPIRE')) {
      expiration = JSON.parse(sessionStorage.getItem('EXPIRE') ?? "-1");
    }
    sessionStorage.removeItem('RESOURCES');
    sessionStorage.removeItem('PATIENT');
    sessionStorage.removeItem('TAB');
    sessionStorage.removeItem('LABEL');
    sessionStorage.removeItem('PASSCODE');
    sessionStorage.removeItem('EXPIRE');
    const accordion = document.querySelector('div.add-data > div.accordion-collapse');
    if (accordion) {
      accordion.style.overflow = 'visible';
      accordion.classList.add('at-load');
      setTimeout(() => {
        accordion.classList.remove('at-load');
      }, 250);
    }
    let tab = document.querySelector(`span.${currentTab}-tab`)?.parentElement
    tab?.click();
  });
  
  async function preAuthRedirectHandler(details: SOFAuthEvent|undefined) {
    sessionStorage.setItem('URL', window.location.href);
    sessionStorage.setItem('RESOURCES', resourceCollection.toJson());
    sessionStorage.setItem('PATIENT', JSON.stringify(patient ?? ""));
    sessionStorage.setItem('TAB', String(currentTab ?? ""));
    sessionStorage.setItem('LABEL', label ?? "");
    sessionStorage.setItem('PASSCODE', passcode ?? "");
    sessionStorage.setItem('EXPIRE', JSON.stringify(expiration ?? -1));
  }

  async function revertPreAuth(details: SOFAuthEvent|undefined) {
    sessionStorage.removeItem('URL');
    sessionStorage.removeItem('RESOURCES');
    sessionStorage.removeItem('PATIENT');
    sessionStorage.removeItem('TAB');
    sessionStorage.removeItem('LABEL');
    sessionStorage.removeItem('PASSCODE');
    sessionStorage.removeItem('EXPIRE');
  }
  
  async function handleNewResources(details: ResourceRetrieveEvent) {
    try {
      resourceResult = details;
      if (resourceResult.resources) {
        let patient = resourceResult.resources.find(r => r.resourceType === 'Patient');
        let datasetMethod = patient.meta?.tag?.find(t => t.system === METHOD_SYSTEM)?.code;
        if (datasetMethod) {
          let { resources, sectionKey, sectionTemplate } = methodSectionHelper(datasetMethod, resourceResult.resources);
          resourceResult = { ...resourceResult, resources, sectionKey, sectionTemplate };
        }
        if (resourceResult.sectionKey) {
          resourceCollection.addSection(resourceResult.sectionKey, resourceResult.sectionTemplate);
        }
        if (!resourcesAdded) {
          let mpResource = JSON.parse(JSON.stringify($masterPatient.resource)) as Patient;
          delete mpResource.link; // Otherwise the IPS patient will be included with future $everything calls
          resourceCollection.addResource(mpResource);
        }
        // Trigger update in ResourceSelector
        let resources = resourceResult.resources.filter(r => !(r && r.resourceType === 'Patient' && r.meta?.tag?.find(t => t.system === PLACEHOLDER_SYSTEM)));
        resourceCollection.addResources(resources, resourceResult.sectionKey);
        showSuccessMessage();
      }
    } catch (e) {
      console.log('Failed', e);
      fetchError = "Error preparing IPS";
    }
  }

  async function handleSHCResultUpdate(details: SHCRetrieveEvent) {
    try {
      shcResult = details;
      if (shcResult.shc && isSHCFile(shcResult.shc)) {
        const decoded = await verify(shcResult.shc.verifiableCredential[0]);
        const data = decoded.fhirBundle;
        stageRetrievedIPS({ips: data, source: shcResult.source});
      } else {
        throw Error("Empty or invalid smart health card");
      }

    } catch (e) {
      console.log('Failed', e);
      fetchError = "Error processing health card";
    }
  }

  async function uploadRetrievedIPS(details: IPSRetrieveEvent) {
    try {
      submitting = true;
      ipsResult = details;
      if (ipsResult.ips) {
        shcsToAdd.unshift(await packageSHC(ipsResult.ips));
        submitSHL();
      }
    } catch (e) {
      submitting = false;
      console.log('Failed', e);
      fetchError = "Error submitting IPS";
    }
  }

  async function stageRetrievedIPS(details: IPSRetrieveEvent) {
    try {
      if (singleIPS && ipsResult.ips) {
        singleIPS = false;
      }
      ipsResult = details;
      if (!ipsResult.ips) {
        throw Error("Empty IPS content: " + JSON.stringify(details));
      }

      let ipsResources = getResourcesFromIPS(ipsResult.ips);
      handleNewResources({ resources: ipsResources });
    } catch (e) {
      console.log('Failed', e);
      fetchError = "Error parsing IPS";
    }
  }

  async function submitSHL() {
    return shlDispatch('shl-submitted', {
      shcs: shcsToAdd,
      label,
      passcode: passcode ?? undefined,
      exp: expiration && expiration > 0 ? new Date().getTime() / 1000 + expiration : undefined,
      patientName: patientName
    });
  }

  async function showSuccessMessage() {
    successMessage = true;
    setTimeout(() => {
      successMessage = false;
    }, 1000);
  }

  function handleAddDataAccordionOverflow(accordionClass: string) {
    const accordion = document.querySelector(`div.${accordionClass} > div.accordion-collapse`);
    if (accordion) {
      accordion.style.overflow = 'hidden';
    } else {
      setTimeout(function() {
        const accordion = document.querySelector(`div.${accordionClass} > div.accordion-collapse`);
        if (accordion) {
          accordion.style.overflow = 'visible';
        }
      }, 500);
    }
  }

  function updateStatus(newStatus: string) {
    status = newStatus;
  }

  function showError(message: string) {
    fetchError = message;
  }

  function confirmContent() {
    submitting = true;
  }

  const categoryNameFor = (category: string) => DATA_CATEGORY_NAMES[category]?.name || category;
  const keyFor = (collection: ResourceCollection) => {
    const { category, sourceName } = collection.getTags();
    return `${sourceName} (${categoryNameFor(category)})`
  };
  let datasets: Writable<Record<string, ResourceCollection>> = writable({});
  function addDataset(collection: ResourceCollection) {
    $datasets[collection.id] = collection;
    let { category, source, sourceName } = collection.getTags();
    handleNewResources({
      resources: collection.getFHIRResources(),
      source,
      sourceName,
      category
    });
  }
  function removeDataset(collection: ResourceCollection) {
    delete $datasets[collection.id];
    $datasets = $datasets;
    resourceCollection.removeResources(collection.getFHIRResources());
  }


  let loadingMap: Record<string, boolean> = {};

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
  let ocSource: Writable<string> = writable('');
  let ocDataset: Readable<any> = derived(
    [userResources, ocCategory, ocSource], 
    ([$userResources, $ocCategory, $ocSource]) => {
      if (!$userResources || !$ocCategory || !$ocSource) {
        return;
      }
      let dataset = $userResources?.[$ocCategory]?.[$ocSource];
      return dataset;
    }
  );
  function setContent(viewName: string, viewCollection: ResourceCollection) {
    let { category, source } = viewCollection.getTags();
    ocCategory.set(category);
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
      {#if $ocDataset && isOpen} <!-- Page freezes without this check -->
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
      <Button
        size="sm"
        outline
        color="success"
        on:click={() => { isOpen = false; addDataset($ocDataset.collection) }}
      >
        <Icon name="plus-circle" /> Add to summary
      </Button>
    </Col>
  </Row>
</Offcanvas>

<h4>Create a Shareable Health Summary</h4>
<p>Create a Health Summary, which can be shared with providers, family members, and others with a QR code or URL.</p>
<p>To get started, add any data from health record sources that you have compiled in {INSTANCE_CONFIG.title}.</p>
<Accordion stayOpen>
  <AccordionItem active>
    <h5 slot="header" class="my-2">1. Add My Data</h5>
    <Accordion>
      {#if $masterPatient !== null}
      <Card>
        <CardHeader>
          <Row>
            <Col class="d-flex justify-content-start align-items-center">
              <h6 class="mt-1">My Demographics</h6>
            </Col>
            <Col class="d-flex justify-content-end align-items-center">
              <Button
                size="sm"
                color="secondary"
                outline
                on:click={() => goto('/data#about-me')}
              >
                Edit
              </Button>
            </Col>
          </Row>
        </CardHeader>
        <CardBody>
          <Row style="overflow: hidden">
            <Col class="resource-content justify-content-center align-items-center">
              <p class="text-secondary">
                <em>
                  This is the patient information that you have added to {INSTANCE_CONFIG.title}.
                  For your summary, you may choose to replace it with the patient data from another source if available (step 2).
                </em>
              </p>
              <Patient content={ {resource: $masterPatient.resource} } />
            </Col>
          </Row>
        </CardBody>
      </Card>
      {/if}
      {#each Object.entries($userResources) as [category, datasetsBySource]}
        <br>
        <Card>
          <CardHeader>
            <h6 class="mt-1">{categoryNameFor(category)}</h6>
          </CardHeader>
          <CardBody>
            {#if $userResources[category]}
              <Row class="g-4 d-flex justify-content-start">
                {#each Object.entries($userResources[category]).sort((a, b) => new Date((get(b[1].patient))?.meta?.lastUpdated) - new Date((get(a[1].patient))?.meta?.lastUpdated)) as [source, dataset]}
                  {@const status = dataset.status}
                  {@const collection = dataset.collection}
                  {@const { method, sourceName, placeholder } = collection.getTags()}
                  {@const patient = get(collection.patient)}
                  <Col xs="12" sm="6" lg="4" style="">
                    <DatasetView {dataset} {masterPatient}>
                      <DropdownMenu slot="menu">
                        <DropdownItem on:click={() => showDataset(collection)}><div class="d-flex justify-content-between w-100">View <Icon name="chevron-right"/></div></DropdownItem>
                      </DropdownMenu>
                      <Button
                        slot="footer"
                        class="d-flex w-100 justify-content-between align-items-center"
                        color="success"
                        outline
                        disabled={$datasets[collection.id] || loadingMap[keyFor(collection)]}
                        on:click={(event) => { addDataset(collection); }}
                      >
                        <div class="d-flex align-items-center" style="min-width: 37px">
                          <DatasetStatusLoader status={status} bind:isLoading={loadingMap[keyFor(collection)]}>
                            <Badge color="primary">{collection.getResourceCount()}</Badge>
                          </DatasetStatusLoader>
                        </div>
                        {#if !$datasets[collection.id]}
                          <div>Add</div>
                          <Icon name="plus-circle"/>
                        {:else}
                          <span class="text-secondary">Added</span>
                          <Icon name="check-circle-fill" color="success"/>
                        {/if}
                      </Button>
                    </DatasetView>
                  </Col>
                {/each}
              </Row>
            {/if}
          </CardBody>
        </Card>
      {/each}
    </Accordion>
  </AccordionItem>
  {#if resourcesAdded}
    <AccordionItem active class="edit-data">
      <h5 slot="header" class="my-2" id="select-data">2. Directly edit your health summary content</h5>
      <h5>Included Data</h5>
      <div class="my-2">
        {#each Object.values($datasets) as dataset}
          <Badge href="" color="light" class="border d-inline-flex align-items-center text-secondary me-1 mb-1">
            <div class="me-1" style="font-size: 1.5em; cursor: pointer" on:click={() => removeDataset(dataset)}><Icon name="x"/></div>
            {keyFor(dataset)}
          </Badge>
        {/each}
      </div>
      <Label>Select which resources to include in your customized IPS</Label>
      <ResourceSelector
        bind:ipsResourceCollection={resourceCollection}
        bind:submitting={submitting}
        on:ips-retrieved={ async ({ detail }) => { uploadRetrievedIPS(detail) } }
        on:status-update={ ({ detail }) => { updateStatus(detail) } }
        on:error={ ({ detail }) => { showError(detail) } }
      />
    </AccordionItem>
  {/if}
</Accordion>
{#if resourcesAdded}
  {#if shlIdParam == null}
    <Row class="mt-4">
      <h5>3. Save your Summary</h5>
    </Row>
    <Row class="mx-2">
      <Label>Save your summary and generate a secure link to it that you can share.</Label>
    </Row>
    <Row class="mx-2">
      <form on:submit|preventDefault={confirmContent}>
        <FormGroup>
          <Label>Enter a name for the Summary:</Label>
          <Input type="text" bind:value={label} on:input={() => { userUpdatedLabel = true }}/>
        </FormGroup>
        <FormGroup>
          <Label for="passcode">Protect with Passcode (optional):</Label>
          <div style="position:relative">
            <Input
              maxlength={40}
              name="passcode"
              type={type}
              autocomplete="off"
              bind:value={passcode}
              placeholder="Assign Passcode"
            />
            <Icon name={icon} 
              style="position: absolute;
              cursor: pointer;
              height: 25px;
              width: 20px;
              top: 6px;
              right: 10px;
              color: rgb(50, 50, 50);"
              onclick={() => showPassword = !showPassword}/>
          </div>
        </FormGroup>
        <FormGroup>
          <Label>Expiration</Label>
          <Input type="radio" bind:group={expiration} value={60 * 60} label="1 hour" />
          <Input type="radio" bind:group={expiration} value={60 * 60 * 24 * 7} label="1 week" />
          <Input type="radio" bind:group={expiration} value={60 * 60 * 24 * 365} label="1 year" />
          <Input type="radio" bind:group={expiration} value={60 * 60 * 24 * 365 * 5} label="5 years" />
          <Input type="radio" bind:group={expiration} value={-1} label="Never" />
        </FormGroup>
        <Row>
          <Col xs="auto">
          <Button color="primary" style="width:fit-content" disabled={submitting} type="submit">
              {#if !submitting}
              Create Summary
              {:else}
              Creating...
              {/if}
          </Button>
          </Col>
          {#if submitting}
            <Col xs="auto" class="d-flex align-items-center px-0">
              <Spinner color="primary" type="border" size="md"/>
            </Col>
            <Col xs="auto" class="d-flex align-items-center">
              <span class="text-secondary">{status}</span>
            </Col>
          {/if}
        </Row>
      </form>
    </Row>
  {:else}
    <Row class="mt-4">
      <h5>4. Include this summary in my secure sharing link</h5>
    </Row>
    <Row class="mx-2">
      <Label>This summary will be shared alongside any other summaries already included in the link.</Label>
    </Row>
    <Row class="mx-2">
      <form on:submit|preventDefault={confirmContent}>
        <Row>
          <Col xs="auto">
          <Button color="primary" style="width:fit-content" disabled={submitting} type="submit">
              {#if !submitting}
              Add Summary
              {:else}
              Adding...
              {/if}
          </Button>
          </Col>
          {#if submitting}
            <Col xs="auto" class="d-flex align-items-center px-0">
              <Spinner color="primary" type="border" size="md"/>
            </Col>
            <Col xs="auto" class="d-flex align-items-center">
              <span class="text-secondary">{status}</span>
            </Col>
          {/if}
        </Row>
      </form>
    </Row>
  {/if}
{/if}
<span class="text-danger">{fetchError}</span>

<style>
  :global(.at-load) {
    transition: all 0s !important;
  }
</style>