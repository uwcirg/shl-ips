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
  import { getContext, onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { PATIENT_IPS, EXAMPLE_IPS, IPS_DEFAULT, BEARER_AUTHORIZATION } from '$lib/config/config';
  import type { SHCRetrieveEvent, IAuthService, IPSRetrieveEvent, ResourceRetrieveEvent } from '$lib/utils/types';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';
  import { getResourcesFromIPS, isIPSBundle } from '$lib/utils/util';

  export let disabled = false;

  let authService: IAuthService = getContext('authService');

  const shcDispatch = createEventDispatcher<{'shc-retrieved': SHCRetrieveEvent}>();
  const ipsDispatch = createEventDispatcher<{'ips-retrieved': IPSRetrieveEvent}>();
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  const CATEGORY = "provider-health-record";
  const METHOD = "provider-health-record-url";
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;

  let summaryUrls = EXAMPLE_IPS;
  let defaultUrl = summaryUrls[IPS_DEFAULT];
  let isOpen = false;
  let processing = false;
  let fetchError = "";

  let shcResult: SHCRetrieveEvent = {
    shc: undefined
  };
  let ipsResult: IPSRetrieveEvent = {
    ips: undefined
  };

  let summaryUrlValidated: URL | undefined = undefined;
  $: {
    setSummaryUrlValidated(defaultUrl);
  }
  $: icon = isOpen ? 'chevron-up' : 'chevron-down';

  function setSummaryUrlValidated(url: string) {
    try {
      summaryUrlValidated = new URL(url);
    } catch {
      summaryUrlValidated = undefined;
    }
  }
  
  onMount(() => {
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    document.addEventListener('click', handleOutsideClick);
  });
  onDestroy(() => {
    window.removeEventListener('resize', updateMenuPosition);
    window.removeEventListener('scroll', updateMenuPosition, true);
    document.removeEventListener('click', handleOutsideClick);
  })
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

  function getSourceName(url: URL | undefined) {
    const selectedUrl = url?.toString();
    const allUrls = {...PATIENT_IPS, ...EXAMPLE_IPS};
    let name = Object.keys(allUrls).find(title => allUrls[title] === selectedUrl);
    if (name) {
      name = name + " Sample Dataset";
    } else {
      name = selectedUrl;
    }
    return name;
  }

  async function prepareIps() {
    fetchError = "";
    processing = true;
    try {
      let content;
      let hostname;
      let headers: any = { accept: 'application/fhir+json' };
      let url;
      if (summaryUrlValidated?.toString().includes('meditech')) {
        url = "/api/url_bearer/meditech?url=" + encodeURIComponent(summaryUrlValidated.toString());
        headers["Authorization"] = `Bearer ${await authService.getAccessToken()}`
      } else if (summaryUrlValidated?.toString().includes('Interconnect-Fhir-Oauth')) {
        url = "/api/url_bearer/epic?url=" + encodeURIComponent(summaryUrlValidated.toString());
        headers["Authorization"] = `Bearer ${await authService.getAccessToken()}`
      } else if (summaryUrlValidated?.toString().includes('openfhir')) {
        headers['epic-client-id'] = `${BEARER_AUTHORIZATION['EpicHIMSS']}`;
      } else {
        url = summaryUrlValidated;
      }

      const contentResponse = await fetch(url!, {
        headers: headers
      }).then(function(response) {
        if (!response.ok) {
          // make the promise be rejected if we didn't get a 2xx response
          throw new Error("Unable to fetch IPS", {cause: response});
        } else {
          return response;
        }
      });
      content = await contentResponse.json();
      hostname = summaryUrlValidated?.hostname;
      processing = false
      
      if (content != undefined && content.verifiableCredential) {
        shcResult = {
          shc: content,
          source: hostname
        };
        return shcDispatch('shc-retrieved', shcResult);
      }

      if (!isIPSBundle(content)) {
        throw Error("Error: URL must return a FHIR IPS Bundle.");
      }

      let result = {
        resources: getResourcesFromIPS(content),
        category: CATEGORY,
        method: METHOD,
        source: hostname,
        sourceName: getSourceName(summaryUrlValidated)
      };
      // ipsDispatch('ips-retrieved', ipsResult);
      resourceDispatch('update-resources', result);
    } catch (e) {
      processing = false;
      console.log('Failed', e);
      fetchError = "Error preparing IPS";
    }
  }
</script>

<form on:submit|preventDefault={() => FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, summaryUrlValidated?.hostname, prepareIps)}>
  <FormGroup>
    <Dropdown {isOpen} toggle={() => {isOpen = !isOpen; updateMenuPosition();}}>
      <DropdownToggle tag="div" class="d-inline-block" style="width:100%">
        <div style="position:relative" bind:this={toggleRef}>
          <Input type="text" bind:value={summaryUrlValidated} />
          <Icon name={icon} 
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
          {#if Object.keys(PATIENT_IPS).length > 0}
            <DropdownItem header>Actual Patient Data (permitted for use)</DropdownItem>
            {#each Object.entries(PATIENT_IPS) as [title, url]}
              <DropdownItem style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"  on:click={() => {
                  setSummaryUrlValidated(url);
              }}>{title} - {url}</DropdownItem>
            {/each}
            <DropdownItem divider></DropdownItem>
          {/if}
          {#if Object.keys(EXAMPLE_IPS).length > 0}
            <DropdownItem header>Test Patient Data</DropdownItem>
            {#each Object.entries(EXAMPLE_IPS) as [title, url]}
              <DropdownItem style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"  on:click={() => {
                  setSummaryUrlValidated(url);
              }}>{title} - {url}</DropdownItem>
            {/each}
          {/if}
        </DropdownMenu>
      </Portal>
    </Dropdown>
  </FormGroup>

  <Row>
    <Col xs="auto">
      <Button color="primary" style="width:fit-content" disabled={processing || disabled || !summaryUrlValidated} type="submit">
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
  
