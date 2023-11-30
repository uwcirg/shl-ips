<script lang="ts">
  import { 
    Button,
    Col,
    Dropdown,
    DropdownMenu,
    DropdownItem,
    DropdownToggle,
    FormGroup,
    Input,
    Label,
    Row,
    Spinner } from 'sveltestrap';

  import { EXAMPLE_IPS, EXAMPLE_IPS_DEFAULT } from './config';
  import type { SHCRetrieveEvent, IPSRetrieveEvent } from './types';
  import { createEventDispatcher } from 'svelte';

  const shcDispatch = createEventDispatcher<{'shc-retrieved': SHCRetrieveEvent}>();
  const ipsDispatch = createEventDispatcher<{'ips-retrieved': IPSRetrieveEvent}>();

  let summaryUrls = EXAMPLE_IPS;
  let defaultUrl = summaryUrls[EXAMPLE_IPS_DEFAULT];
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
      const contentResponse = await fetch(summaryUrlValidated!, {
      headers: { accept: 'application/fhir+json' }
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

<form on:submit|preventDefault={() => prepareIps()}>
<FormGroup>
  <Label>Fetch summary from URL</Label>
  <Dropdown {isOpen} toggle={() => (isOpen = !isOpen)}>
    <DropdownToggle tag="div" class="d-inline-block" style="width:100%">
      <Input type="text" bind:value={summaryUrlValidated} />
    </DropdownToggle>
    <DropdownMenu style="width:100%">
      {#each Object.entries(summaryUrls) as [title, url]}
        <DropdownItem style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"  on:click={() => {
            setSummaryUrlValidated(url);
        }}>{title} - {url}</DropdownItem>
      {/each}
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
  <Col xs="auto">
    <Spinner color="primary" type="border" size="md"/>
  </Col>
  {/if}
</Row>
</form>

<span class="text-danger">{fetchError}</span>
  