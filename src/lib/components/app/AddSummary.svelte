<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getContext } from 'svelte';
  import { type Writable, get } from 'svelte/store';
  import {
    Accordion,
    AccordionItem,
    Button,
    Card,
    CardBody,
    CardHeader,
    Col,
    FormGroup,
    Icon,
    Input,
    Label,
    Row,
    Spinner,
    TabContent,
    TabPane
  } from 'sveltestrap';
  import { DATA_CATEGORIES, SOURCE_NAME_SYSTEM } from '$lib/config/config';
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
        // Prevent flash of AddData accordion overflow when first resources are added
        handleAddDataAccordionOverflow('add-data');
      }
    }
  }

  let userUpdatedLabel = false;
  let selectedPatientStore = resourceCollection.selectedPatient;
  $: {
    if ($selectedPatientStore) {
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
      if (resourceResult.sectionKey) {
        resourceCollection.addSection(resourceResult.sectionKey, resourceResult.sectionTemplate);
      }
      if (resourceResult.resources) {
        if (!resourcesAdded) {
          let mpResource = $masterPatient.resource;
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
</script>

<h4>Create a Shareable Health Summary</h4>
<p>Create a Health Summary, which can be shared with providers, family members, and others with a QR code or URL.</p>
<p>To get started, add any data from health record sources that you have compiled in WA Health Summary.</p>
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
            <h6 class="mt-1">{DATA_CATEGORIES[category]?.title || category}</h6>
          </CardHeader>
          <CardBody>
            {#each Object.entries(datasetsBySource) as [source, dataset]}
            <AccordionItem>
              <div slot="header" class="d-flex justify-content-between align-items-center flex-nowrap w-100" style="max-width: calc(100% - 2.5rem);">
                <div class="flex-grow-1 text-break">
                  <h6
                    class="mt-1"
                    title={source}
                    style="max-width: 100%; overflow-wrap: anywhere;"
                  >
                    {get(dataset.patient).meta.tag.find((tag) => tag.system === SOURCE_NAME_SYSTEM)?.code || source}
                  </h6>
                </div>
                <div class="ms-3 flex-shrink-0">
                  <Button
                    size="sm"
                    color="success"
                    outline
                    on:click={() => handleNewResources({ resources: dataset.getFHIRResources(), source, category })}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <FHIRResourceList
                bind:resourceCollection={dataset}
                bind:submitting={submitting}
                on:status-update={ ({ detail }) => { updateStatus(detail) } }
                on:error={ ({ detail }) => { showError(detail) } }
              />
            </AccordionItem>
            {/each}
          </CardBody>
        </Card>
      {/each}
    </Accordion>
  </AccordionItem>
  {#if resourcesAdded}
    <AccordionItem active class="edit-data">
      <h5 slot="header" class="my-2">2. Directly edit your health summary content</h5>
      <Label>Select which resources to include in your customized IPS</Label>
      <ResourceSelector
        bind:resourceCollection={resourceCollection}
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
{#if $mode === "advanced"}
  <br>
  <em class="text-secondary">* Advanced features for demo purposes only</em>
  <br>
{/if}

<style>
  :global(.at-load) {
    transition: all 0s !important;
  }
</style>