<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getContext } from 'svelte';
  import { type Writable } from 'svelte/store';
  import {
    Accordion,
    AccordionItem,
    Button,
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
  import FetchUrl from '$lib/components/app/FetchUrl.svelte';
  import FetchFile from '$lib/components/app/FetchFile.svelte';
  import FetchSoF from '$lib/components/app/FetchSoF.svelte';
  import FetchAD from '$lib/components/app/FetchAD.svelte';
  import FetchTEFCA from '$lib/components/app/FetchTEFCA.svelte';
  import FetchCARINBB from '$lib/components/app/FetchCARINBB.svelte';
  import PatientDataForm from '$lib/components/app/PatientDataForm.svelte';
  import ODHForm from '$lib/components/app/ODHForm.svelte';
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
  import type { Patient } from 'fhir/r4';
  import { IPSResourceCollection } from '$lib/utils/IPSResourceCollection.js';
 
  export let status = "";
  
  let shlIdParam = $page.url.searchParams.get('shlid');

  const shlDispatch = createEventDispatcher<{ 'shl-submitted': SHLSubmitEvent }>();
  let submitting = false;
  let fetchError = "";
  let currentTab: string | number = 'url';
  let emptyResourceListHeader = "Retrieve Your Health Information";
  let fullResourceListHeader = "1. Add information from another provider"
  let addDataHeader = emptyResourceListHeader;
  let successMessage = false;
  
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

  let label = 'Health Summary ' + new Date().toISOString().slice(0, 10);
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
        handleAddDataAccordionOverflow();
      }
    }
  }

  let userUpdatedLabel = false;
  let selectedPatientStore = resourceCollection.selectedPatient;
  $: {
    if ($selectedPatientStore) {
      patient = resourceCollection.getSelectedPatient()?.resource as Patient;
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
      label = label + " Summary Link " + new Date().toISOString().slice(0, 10);
    }
  }
  $: {
    if ($mode === 'normal') {
      setTimeout(() => document.querySelector(`span.default-tab`)?.parentElement?.click(), 1); 
    }
  }

  onMount(() => {
    if (sessionStorage.getItem('URL')) {
      let url = sessionStorage.getItem('URL') ?? '/create';
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

    document.querySelector(`span.${currentTab}-tab`)?.parentElement?.click();
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
        // Trigger update in ResourceSelector
        resourceCollection.addResources(resourceResult.resources, resourceResult.sectionKey, resourceResult.sectionTemplate);
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

  function handleAddDataAccordionOverflow() {
    const accordion = document.querySelector('div.add-data > div.accordion-collapse');
    if (accordion) {
      accordion.style.overflow = 'hidden';
    } else {
      setTimeout(function() {
        const accordion = document.querySelector('div.add-data > div.accordion-collapse');
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
<Accordion stayOpen>
  <AccordionItem
    active={!resourcesAdded}
    class="add-data"
    on:toggle={handleAddDataAccordionOverflow}
  >
    <h5 slot="header" class="my-2">{addDataHeader}</h5>
    {#if !resourcesAdded}
      <p>Select your provider below, then press "Fetch Data" to begin building your Health Summary.</p>
    {:else}
      <p>Select another provider below, then press "Fetch Data" to add more data to your Health Summary.</p>
    {/if}
    <TabContent on:tab={(e) => {
      currentTab = e.detail;
    }}>
      <TabPane class="default-tab" tabId="default" style="padding-top:10px" active>
        <span class="default-tab" slot="tab">SMART Patient Access</span>
        <FetchSoF
          on:sof-auth-init={ async ({ detail }) => { preAuthRedirectHandler(detail) } }
          on:sof-auth-fail={ async ({ detail }) => { revertPreAuth(detail) }}
          on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
          on:ips-retrieved={ async ({ detail }) => { stageRetrievedIPS(detail) } }
          on:shc-retrieved={ async ({ detail }) => { handleSHCResultUpdate(detail) } }>
        </FetchSoF>
      </TabPane>
      {#if $mode === "advanced"}
        <TabPane class="carin-tab" tabId="carin" style="padding-top:10px">
          <span class="carin-tab" slot="tab">*CARIN BB</span>
          <FetchCARINBB
            on:sof-auth-init={ async ({ detail }) => { preAuthRedirectHandler(detail) } }
            on:sof-auth-fail={ async ({ detail }) => { revertPreAuth(detail) }}
            on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
            on:ips-retrieved={ async ({ detail }) => { stageRetrievedIPS(detail) } }
            on:shc-retrieved={ async ({ detail }) => { handleSHCResultUpdate(detail) } }>
          </FetchCARINBB>
        </TabPane>
        <TabPane class="url-tab" tabId="url" style="padding-top:10px">
          <span class="url-tab" slot="tab">*FHIR URL</span>
          <FetchUrl
            on:shc-retrieved={ async ({ detail }) => { handleSHCResultUpdate(detail) } }
            on:ips-retrieved={ async ({ detail }) => { stageRetrievedIPS(detail) } }>
          </FetchUrl>
        </TabPane>
        <TabPane class="file-tab" tabId="file" style="padding-top:10px">
          <span class="file-tab" slot="tab">*File Upload</span>
          <FetchFile
            on:shc-retrieved={ async ({ detail }) => { handleSHCResultUpdate(detail) } }
            on:ips-retrieved={ async ({ detail }) => { stageRetrievedIPS(detail) } }>
          </FetchFile>
        </TabPane>
        <TabPane class="tefca-tab" tabId="tefca" style="padding-top:10px">
          <span class="tefca-tab" slot="tab">*TEFCA Query</span>
          <FetchTEFCA
            on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }>
          </FetchTEFCA>
      </TabPane>
      {/if}
    </TabContent>
  </AccordionItem>
  {#if resourcesAdded}
    <AccordionItem class="patient-data">
      <h5 slot="header" class="my-2">2. Add your own information <span class="text-secondary"><em>(under development)</em></span></h5>
      <PatientDataForm
        patient={patient}
        on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
      />
    </AccordionItem>
    <AccordionItem class="odh-data">
      <h5 slot="header" class="my-2">3. Add health-related occupational information</h5>
      <Label>It may be helpful to include information about the work you do in your medical summary</Label>
      <ODHForm
        on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
      />
    </AccordionItem>
    <AccordionItem class="ad-data">
      <h5 slot="header" class="my-2">4. Add advance directives</h5>
      <Label>Advance directives help providers know more about your medical preferences</Label>
      <FetchAD
        on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
      />
    </AccordionItem>
    <ResourceSelector
      bind:resourceCollection={resourceCollection}
      bind:submitting={submitting}
      on:ips-retrieved={ async ({ detail }) => { uploadRetrievedIPS(detail) } }
      on:status-update={ ({ detail }) => { updateStatus(detail) } }
      on:error={ ({ detail }) => { showError(detail) } }
    />
  {/if}
</Accordion>
{#if resourcesAdded}
  {#if shlIdParam == null}
    <Row class="mt-4">
      <h5>6. Save and create your summary</h5>
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