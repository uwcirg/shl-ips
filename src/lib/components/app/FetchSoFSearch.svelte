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
  let allHosts;
  $: allHosts = [...epicHosts, ...cernerHosts].sort((e1, e2) => {
    if (sofHost?.endpoint === e1.endpoint) {
      return -1;
    }
    if (sofHost?.endpoint === e2.endpoint) {
      return 1;
    }
    return e1.name.localeCompare(e2.name)
  });
  let selectOccurred = false;
  let filteredHosts = allHosts;
  $: {
    if (searchString && !selectOccurred) {
      filteredHosts = allHosts.filter(e => e.name?.toLowerCase().includes(searchString.toLowerCase()));
    } else {
      filteredHosts = allHosts;
    }
    selectOccurred = false;
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
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    document.addEventListener('click', handleOutsideClick);
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
  onDestroy(() => {
    window.removeEventListener('resize', updateMenuPosition);
    window.removeEventListener('scroll', updateMenuPosition, true);
    document.removeEventListener('click', handleOutsideClick);
  })

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

  let isOpen = false;
  let toggleRef: HTMLDivElement | undefined = undefined;
  let menuStyle = '';
  function handleOutsideClick(event: any) {
    if (toggleRef && !toggleRef.contains(event.target)) {
      isOpen = false;
    }
  }
  
  function updateMenuPosition() {
    if (!toggleRef) return;
    const rect = toggleRef.getBoundingClientRect();
    if (!rect) return;
    menuStyle = `
      position: absolute;
      top: ${rect.bottom + window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      z-index: 2000;
    `;
  }

</script>

<form on:submit|preventDefault={() => FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, sofHost?.name, prepareIps)}>
  <FormGroup>
    <Dropdown {isOpen} toggle={() => {isOpen = !isOpen; updateMenuPosition();}}>
      <DropdownToggle tag="div" class="d-inline-block" style="width:100%">
        <div style="position:relative" bind:this={toggleRef}>
          <Input
            type="text"
            bind:value={searchString}
            id="provider-search"
            on:click={() => isOpen = true}
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
      </DropdownToggle>
      <Portal>
        <DropdownMenu style={`max-height: 250px; overflow:scroll; ${menuStyle}`}>
          {#each filteredHosts as host, index}
            <DropdownItem
              style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
              active={host.endpoint == sofHost?.endpoint}
              on:click={() => {
                searchString = host.name;
                sofHost = host;
                selectOccurred = true;
                filteredHosts = allHosts;
                isOpen = true;
              }}
            >
              {host.name}
            </DropdownItem>
            {#if index === 0 && sofHost}
              <DropdownItem divider />
            {/if}
          {/each}
        </DropdownMenu>
      </Portal>
    </Dropdown>
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
