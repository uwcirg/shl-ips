<script lang="ts">
  import {
    Button,
    Col,
    Dropdown,
    DropdownMenu,
    DropdownItem,
    DropdownToggle,
    FormGroup,
    Icon,
    Input,
    Label,
    ListGroup,
    ListGroupItem,
    Portal,
    Row,
    Spinner } from 'sveltestrap';
  import { EPIC_CLIENT_ID, CERNER_CLIENT_ID, SOF_ENDPOINTS } from '$lib/config/config';
  import type { ResourceRetrieveEvent, SOFAuthEvent, SOFHost } from '$lib/utils/types';
  import type { Resource } from 'fhir/r4';
  import { authorize, endSession, getResourcesWithReferences } from '$lib/utils/sofClient.js';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { clearURLOfParams, getResourcesFromIPS } from '$lib/utils/util';
  import { page } from '$app/stores';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';

  export let disabled = false;
  
  const authDispatch = createEventDispatcher<{'sof-auth-init': SOFAuthEvent; 'sof-auth-fail': SOFAuthEvent}>();
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  const CATEGORY = "provider-health-record";
  const METHOD = "provider-health-record-sof-search";
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;

  let processing = false;
  let fetchError = "";
  let result: ResourceRetrieveEvent = {
    resources: undefined,
    category: CATEGORY,
    method: METHOD,
    source: undefined,
    sourceName: undefined
  };

  let searchString = "";

  let sofHost:SOFHost | undefined;

  let epicHosts = SOF_ENDPOINTS["epic"];
  let cernerHosts = SOF_ENDPOINTS["cerner"];
  // let allHosts = [...epicHosts, ...cernerHosts];
  let allHosts = [...epicHosts].sort((e1, e2) => {
    if (sofHost?.endpoint === e1.endpoint) {
      return -1;
    }
    if (sofHost?.endpoint === e2.endpoint) {
      return 1;
    }
    return e1.name.localeCompare(e2.name)
  });
  let selectOccurred = false;
  let filteredHosts: any = [];
  let otherHosts = allHosts;
  $: {
    if (searchString) {
      filteredHosts = allHosts.filter(e => sofHost?.name !== e.name && e.name?.toLowerCase().includes(searchString.toLowerCase()));
      filteredHosts.sort((e1, e2) => e1.name.startsWith(searchString) ? -1 : 1);
      otherHosts = allHosts.filter(e => sofHost?.name !== e.name && !filteredHosts.includes(e));
      scrollResultsIntoView();
    }
    selectOccurred = false;
  }

  function scrollResultsIntoView() {
    let results = document.getElementById("results");
    if (results) {
      results.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest"
        });
    }
  }

  async function prepareIps() {
    fetchError = "";
    try {
      if (sofHost) {
        try {
          sessionStorage.setItem('AUTH_METHOD', 'sof');
          let clientId = epicHosts.find(e => e.endpoint == sofHost.endpoint) ? EPIC_CLIENT_ID : cernerHosts.find(e => e.endpoint == sofHost.endpoint) ? CERNER_CLIENT_ID : null;
          if (!clientId) {
            throw Error(`Invalid endpoint selection: ${sofHost.endpoint}`);
          }
          authorize(sofHost.endpoint, clientId);
          authDispatch('sof-auth-init', { data: true });
        } catch (e) {
          authDispatch('sof-auth-fail', { data: false });
        }
      }
    } catch (e) {
      console.log('Failed', e);
      fetchError = "Error preparing IPS";
    }
  }

  onMount(async function() {
    let method = sessionStorage.getItem('AUTH_METHOD');
    if (!method || method != 'sof') {
      return;
    }
    sessionStorage.removeItem('AUTH_METHOD');
    let key = sessionStorage.getItem('SMART_KEY');
    if (key) {
      let token = sessionStorage.getItem(JSON.parse(key));
      if (token) {
        let url = JSON.parse(token).serverUrl;
        let sofHostAuthd = allHosts.find(e => e.endpoint == url);
        if (sofHostAuthd) {
          sofHost = sofHostAuthd;
          await fetchData();
        }
      }
    }
  });

  async function fetchData() {
    processing = true;
    try {
      let retrievedResources = await getResourcesWithReferences(1);
      const isIps = (e) => e.resourceType === 'Bundle' && e.type === 'document' && e.entry?.[0]?.resource?.resourceType === 'Composition' && e.entry?.[0]?.resource?.type?.coding?.some(e => e.code == '60591-5' && e.system == 'http://loinc.org');
      let ipsBundles = retrievedResources.filter(e => isIps(e));
      let nonIpsResources = retrievedResources.filter(e => !isIps(e));
      let allResources: Resource[] = nonIpsResources;
      for (const ips of ipsBundles) {
        allResources.concat(await getResourcesFromIPS(ips));
      }
      result = {
        resources: allResources,
        category: CATEGORY,
        method: METHOD,
        source: sofHost?.endpoint,
        sourceName: sofHost?.name
      };
      resourceDispatch('update-resources', result);
      return;
    } catch (e: any) {
      console.log(e.message);
      fetchError = e.message;
    } finally {
      processing = false;
      window.history.replaceState(null, "", clearURLOfParams($page.url));
      endSession();
    }
  }

</script>

<form on:submit|preventDefault={() => FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, sofHost?.name, prepareIps)}>
  <FormGroup>
    <div style="width: 100%" class="d-inline-block mb-1">
      <div style="position:relative">
        <Input
          type="text"
          bind:value={searchString}
          id="provider-search"
          placeholder="Search for a provider..."
        />
        <Icon name="search"
          style="position: absolute;
          cursor: pointer;
          height: 25px;
          width: 20px;
          top: 6px;
          right: 10px;
          color: rgb(50, 50, 50);"/>
      </div>
    </div>
    {#if sofHost}
    <ListGroup theme="light" class="mt-2 border rounded" flush>
      <ListGroupItem color="primary">
        <h6>Selected Provider</h6>
      </ListGroupItem>
      <ListGroupItem>
        {sofHost.name}
      </ListGroupItem>
    </ListGroup>
    {/if}
    <ListGroup class="mt-2 border rounded" flush style="height: 250px; overflow:auto;">
      {#if filteredHosts.length > 0}
        <ListGroupItem id="results" color="secondary">
          <h6>Results</h6>
        </ListGroupItem>
      {:else}
        <ListGroupItem color="secondary">
          <h6>{sofHost ? "Other " : ""}Providers</h6>
        </ListGroupItem>
      {/if}
      {#each filteredHosts as host}
        <ListGroupItem
          active={host.endpoint == sofHost?.endpoint && host.name == sofHost?.name}
          on:click={() => {
            searchString = host.name;
            sofHost = host;
            selectOccurred = true;
          }}
        >
          {host.name}
        </ListGroupItem>
      {/each}
      {#if filteredHosts.length > 0}
        <ListGroupItem color="secondary">
          <h6>Other Providers</h6>
        </ListGroupItem>
      {/if}
      {#each otherHosts as host}
        <ListGroupItem
          active={host.endpoint == sofHost?.endpoint && host.name == sofHost?.name}
          on:click={() => {
            searchString = host.name;
            sofHost = host;
            selectOccurred = true;
          }}
        >
          {host.name}
        </ListGroupItem>
      {/each}
    </ListGroup>
  </FormGroup>

  <Row>
    <Col xs="auto">
    <Button color="primary" style="width:fit-content" disabled={processing || disabled} type="submit">
      {#if !processing}
        Fetch Data
      {:else}
        Fetching...
      {/if}
    </Button>
    </Col>
  {#if processing}
    <Col xs="auto" class="d-flex align-items-center px-0">
      <Spinner color="primary" type="border" size="md"/>
    </Col>
  {/if}
  {#if disabled}
    <Col xs="auto" class="d-flex align-items-center px-0">
      Please wait...
    </Col>
  {/if}
  </Row>
</form>
<FHIRDataServiceChecker bind:this={FHIRDataServiceCheckerInstance}/>
<span class="text-danger">{fetchError}</span>
