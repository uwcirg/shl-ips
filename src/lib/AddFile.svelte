<script lang="ts">
  import * as jose from 'jose';
  import * as pako from 'pako';
  import { createEventDispatcher, onMount } from 'svelte';
  import {
    Accordion,
    AccordionItem,
    Button,
    Card,
    CardBody,
    CardText,
    Col,
    FormGroup,
    Icon,
    Input,
    Label,
    Row,
    Spinner,
    TabContent,
    TabPane } from 'sveltestrap';
  import FetchUrl from './FetchUrl.svelte';
  import FetchFile from './FetchFile.svelte';
  import FetchSoF from './FetchSoF.svelte';
  import FetchIIS from './FetchIIS.svelte';
  import ODHForm from './ODHForm.svelte';
  import ResourceSelector from './ResourceSelector.svelte';
  import { verify } from './shc-decoder.js';

  import issuerKeys from './issuer.private.jwks.json';
  import { type SHCFile,
    type Bundle,
    type SHCRetrieveEvent,
    type ResourceRetrieveEvent,
    type IPSRetrieveEvent,
    type SHLSubmitEvent, 
    type SOFAuthEvent,
    ResourceHelper} from './types';
  import { page } from '$app/stores';
  import { getResourcesFromIPS } from './resourceUploader.js';
  import { goto } from '$app/navigation';

  export let status = "";
  
  let shlIdParam = $page.url.searchParams.get('shlid');

  const shlDispatch = createEventDispatcher<{ 'shl-submitted': SHLSubmitEvent }>();
  let submitting = false;
  let fetchError = "";
  let currentTab: string | number;
  currentTab = 'url';
  let emptyResourceListHeader = "Retrieve Your Health Data";
  let fullResourceListHeader = "1. Add data from another provider"
  let addDataHeader = emptyResourceListHeader;
  let addDataOpen = true;
  let successMessage = false;

  let resourceResult: ResourceRetrieveEvent = {
    resources: undefined
  }
  let shcResult: SHCRetrieveEvent = {
    shc: undefined
  }
  let ipsResult: IPSRetrieveEvent = {
    ips: undefined
  }

  let resourcesToReview: any[] = [];
  let shcsToAdd: SHCFile[] = [];
  let singleIPS = true;
  let odhData: {section: any|undefined; resources: any[]|undefined} = {
    section: undefined,
    resources: undefined
  };
  let resourcesToInject: Record<string, {section: any|undefined; resources: {[key: string]: ResourceHelper}}> = {};
  let patientName = "My";
  let patient: any | undefined;

  let label = 'Health Summary ' + new Date().toISOString().slice(0, 10);
  let expiration: number | null = -1;
  let type = 'password';
  let showPassword = false;
  let passcode = "";
  $: type = showPassword ? 'text' : 'password';
  $: icon = showPassword ? 'eye-fill' : 'eye-slash-fill';
  $: addDataHeader = resourcesToReview.length == 0 ? emptyResourceListHeader : fullResourceListHeader;
  $: {
    if (patient) {
      patientName = patient.name[0]?.given[0];
    }
    if (patientName) {
      console.log("Patient name: " + patientName);
      label = (patientName !== undefined ? patientName.charAt(0).toUpperCase() + patientName.slice(1).toLowerCase() + "'s" : "My")+ " Summary Link " + new Date().toISOString().slice(0, 10);
    }
  }
  $: {
    if (odhData.resources || odhData.section) {
      let odhInjection: {section: any|undefined; resources: {[key: string]: ResourceHelper}}  = {
        section: odhData.section,
        resources: {}
      }
      odhData.resources?.forEach((r) => {
        let rh = new ResourceHelper(r.resource);
        odhInjection.resources[rh.tempId] = rh;
      });
      resourcesToInject["Occupational Data for Health"] = odhInjection;
    } else {
      delete resourcesToInject["Occupational Data for Health"];
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
      resourcesToReview = JSON.parse(sessionStorage.getItem('RESOURCES') ?? "") ?? resourcesToReview;
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
    }

    document.querySelector(`span.${currentTab}-tab`)?.parentElement?.click();
  });

  async function handleNewResources(details: ResourceRetrieveEvent) {
      try {
        resourceResult = details;
        if (resourceResult.resources) {
          handleAddDataAccordion({ event: true });
          // Trigger update in ResourceSelector
          resourcesToReview = resourceResult.resources;
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

  async function preAuthRedirectHandler(details: SOFAuthEvent|undefined) {
    sessionStorage.setItem('URL', window.location.href);
    sessionStorage.setItem('RESOURCES', JSON.stringify(resourcesToReview ?? ""));
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
  
  function isSHCFile(object: any): object is SHCFile {
    return 'verifiableCredential' in object;
  }

  async function packageSHC(content:SHCFile | Bundle | undefined): Promise<SHCFile> {
      if (content != undefined && isSHCFile(content) && content.verifiableCredential) {
        return content;
      }

      const shc = await signJws(content);

      return { verifiableCredential: [shc] };
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

  const exampleSigningKey = jose.importJWK(issuerKeys.keys[0]);
  async function signJws(payload: unknown) {
    const fields = { zip: 'DEF', alg: 'ES256', kid: issuerKeys.keys[0].kid };
    const body = pako.deflateRaw(
      JSON.stringify({
        iss: 'https://spec.smarthealth.cards/examples/issuer',
        nbf: new Date().getTime() / 1000,
        vc: {
          type: ['https://smarthealth.cards#health-card'],
          credentialSubject: {
            fhirVersion: '4.0.1',
            fhirBundle: payload
          }
        }
      })
    );

    const signed = new jose.CompactSign(body)
    .setProtectedHeader(fields)
    .sign(await exampleSigningKey);
    return signed;
  }

  async function showSuccessMessage() {
    successMessage = true;
    setTimeout(() => {
      successMessage = false;
    }, 1000);
  }

  function handleAddDataAccordion({ detail }) {
    addDataOpen = detail;
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

  function confirmContent() {
    submitting = true;
  }
</script>
<Accordion stayOpen>
  <AccordionItem
    active={resourcesToReview.length == 0}
    class="add-data"
    on:toggle={handleAddDataAccordion}
  >
    <h5 slot="header" class="my-2">{addDataHeader}</h5>
    {#if resourcesToReview.length == 0}
      <p>Select your provider below, then press "Fetch Data" to begin building your Health Summary.</p>
    {:else}
      <p>Select another provider below, then press "Fetch Data" to add more data to your Health Summary.</p>
    {/if}
    <TabContent on:tab={(e) => {
      currentTab = e.detail;
    }}>
      <TabPane class="smart-tab" tabId="smart" style="padding-top:10px" active>
        <span class="smart-tab" slot="tab">SMART Patient Access</span>
        <FetchSoF
          on:sof-auth-init={ async ({ detail }) => { preAuthRedirectHandler(detail) } }
          on:sof-auth-fail={ async ({ detail }) => { revertPreAuth(detail) }}
          on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
          on:shc-retrieved={ async ({ detail }) => { handleSHCResultUpdate(detail) } }>
        </FetchSoF>
      </TabPane>
      <TabPane class="iis-tab" tabId="iis" style="padding-top:10px">
        <span class="iis-tab" slot="tab">WA Immunization Registry</span>
        <FetchIIS
          on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }>
        </FetchIIS>
      </TabPane>
      <TabPane class="url-tab" tabId="url" style="padding-top:10px">
        <span class="url-tab" slot="tab" >FHIR URL</span>
        <FetchUrl
          on:shc-retrieved={ async ({ detail }) => { handleSHCResultUpdate(detail) } }
          on:ips-retrieved={ async ({ detail }) => { stageRetrievedIPS(detail) } }>
        </FetchUrl>
      </TabPane>
      <TabPane class="file-tab" tabId="file" style="padding-top:10px">
        <span class="file-tab" slot="tab">File Upload</span>
        <FetchFile
          on:shc-retrieved={ async ({ detail }) => { handleSHCResultUpdate(detail) } }
          on:ips-retrieved={ async ({ detail }) => { stageRetrievedIPS(detail) } }>
        </FetchFile>
      </TabPane>
    </TabContent>
  </AccordionItem>
  {#if resourcesToReview.length > 0}
    <AccordionItem active class="odh-data">
      <h5 slot="header" class="my-2">2. Add health-related occupational information</h5>
      <Label>It may be helpful to include information about the work you do in your medical summary</Label>
      <ODHForm bind:odhSection={odhData.section} bind:odhSectionResources={odhData.resources} />
    </AccordionItem>
    <ResourceSelector
      bind:newResources={resourcesToReview}
      bind:patient={patient}
      bind:submitSelections={submitting}
      bind:injectedResources={resourcesToInject}
      on:ips-retrieved={ async ({ detail }) => { uploadRetrievedIPS(detail) } }
      on:status-update={ ({ detail }) => { updateStatus(detail) } }
    />
  {/if}
</Accordion>
{#if resourcesToReview.length > 0}
  {#if shlIdParam == null}
    <Row class="mt-4">
      <h5>4. Save and create your SMART Health Link</h5>
    </Row>
    <Row class="mx-2">
      <Label>Save your summary and generate a secure link to it that you can share.</Label>
    </Row>
    <Row class="mx-2">
      <FormGroup>
        <Label>Enter a name for the Summary:</Label>
        <Input type="text" bind:value={label} />
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
  
      <form on:submit|preventDefault={confirmContent}>
        <Row>
          <Col xs="auto">
          <Button color="primary" style="width:fit-content" disabled={submitting} type="submit">
              {#if !submitting}
              Create Summary Link
              {:else}
              Creating Link...
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
    <h5>4. Add this summary to your SMART Health Link</h5>
  </Row>
  <Row class="mx-2">
    <Label>It will be shared alongside any other contents of the link.</Label>
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
  <span class="text-danger">{fetchError}</span>
  {#if resourcesToReview.length > 0}
    {#if false && ipsResult.ips}
      <Row class="align-items-center">
        <Col xs="auto">
          <Button
            color="secondary"
            style="width:fit-content"
            disabled={submitting}
            type="button"
            on:click={() => {uploadRetrievedIPS(ipsResult)}}>
            {#if !submitting}
            Submit Unchanged IPS
            {:else}
            Submitting...
            {/if}
          </Button>
        </Col>
        {#if submitting}
        <Col xs="auto" class="d-flex align-items-center px-0">
          <Spinner color="primary" type="border" size="md"/>
        </Col>
        {/if}
        <Col xs="auto">
          <Card color="light">
            <CardBody>
              <CardText color="light" style="overflow: hidden; text-overflow: ellipsis">
                <Icon name="file-earmark-text" /> {ipsResult.source}
              </CardText>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <br/>
    {/if}
  {/if}
{/if}
