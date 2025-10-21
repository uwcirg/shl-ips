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
    Row,
    Spinner } from 'sveltestrap';
  import { getContext } from 'svelte';
  import { PATIENT_IPS, EXAMPLE_IPS, IPS_DEFAULT, BEARER_AUTHORIZATION } from '$lib/config/config';
  import type { SHCRetrieveEvent, IAuthService, IPSRetrieveEvent } from '$lib/utils/types';
  import { createEventDispatcher } from 'svelte';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';

  let authService: IAuthService = getContext('authService');

  const shcDispatch = createEventDispatcher<{'shc-retrieved': SHCRetrieveEvent}>();
  const ipsDispatch = createEventDispatcher<{'ips-retrieved': IPSRetrieveEvent}>();

  const CATEGORY = "fetch-url";
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
      ipsResult = {
        ips: content,
        source: hostname
      };
      ipsDispatch('ips-retrieved', ipsResult);
    } catch (e) {
      processing = false;
      console.log('Failed', e);
      fetchError = "Error preparing IPS";
    }
  }
</script>

<form on:submit|preventDefault={() => FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, summaryUrlValidated, prepareIps)}>
<FormGroup>
  <Label>Fetch summary from URL</Label>
  <Dropdown {isOpen} toggle={() => (isOpen = !isOpen)}>
    <DropdownToggle tag="div" class="d-inline-block" style="width:100%">
      <div style="position:relative">
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
    <DropdownMenu style="max-height: 400px; width:100%; overflow:scroll">
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
  </Dropdown>
</FormGroup>

<Row>
  <Col xs="auto">
    <Button color="primary" style="width:fit-content" disabled={!summaryUrlValidated || processing} type="submit">
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
</Row>
</form>
<FHIRDataServiceChecker bind:this={FHIRDataServiceCheckerInstance}/>
<span class="text-danger">{fetchError}</span>
  
