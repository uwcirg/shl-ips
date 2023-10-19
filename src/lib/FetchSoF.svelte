<script lang="ts">
  import {
    Button,
    Col,
    FormGroup,
    Icon,
    Input,
    Label,
    Row,
    Spinner } from 'sveltestrap';

  import { SOF_HOSTS } from './config';
  import type { ResourceRetrieveEvent, SOFHost } from './types';
  import { authorize, retrieve } from './sofClientTSWrapper';
  import { createEventDispatcher, onMount } from 'svelte';
  
  const resourceDispatch = createEventDispatcher<{'updateResources': ResourceRetrieveEvent}>();
  let processing = false;
  let fetchError = "";
  export let result: ResourceRetrieveEvent = {
    resources: undefined
  };

  let sofHostSelection = SOF_HOSTS[0].id;
  let sofHost:SOFHost | undefined = SOF_HOSTS.find(e => e.id == sofHostSelection);
  
  $: {
    if (sofHostSelection) {
      sofHost = SOF_HOSTS.find(e => e.id == sofHostSelection);
    }
  }

  async function prepareIps() {
    fetchError = "";
    try {
      if (sofHost) {
        authorize(sofHost.url, sofHost.clientId);
      }
    } catch (e) {
      console.log('Failed', e);
      fetchError = "Error preparing IPS";
    }
  }

  onMount(async function() {
    let key = sessionStorage.getItem('SMART_KEY');
    if (key) {
      let token = sessionStorage.getItem(JSON.parse(key));
      if (token) {
        let url = JSON.parse(token).serverUrl;
        let sofHostAuthd = SOF_HOSTS.find(e => e.url == url);
        if (sofHostAuthd) {
          sofHost = sofHostAuthd;
          sofHostSelection = sofHost.id;
          await fetchData();
        }
      }
    }
  });

  function endSession() {
    let key = sessionStorage.getItem('SMART_KEY');
    if (key) {
      sessionStorage.removeItem(key);
      sessionStorage.removeItem('SMART_KEY');
    }
  }

  async function fetchData() {
    processing = true;
    let resources = await retrieve();
    result.resources = resources;
    console.log(resources)
    processing = false;
    return resourceDispatch('updateResources', result);
  }

</script>
<form on:submit|preventDefault={() => prepareIps()}>
  <FormGroup>
      <Label>Fetch via SMART authorization</Label>
      {#each SOF_HOSTS as host}
      <Input type="radio" bind:group={sofHostSelection} value={host.id} label={host.name}/>
      <p class="text-secondary" style="margin-left:25px">{@html host.note}</p>
      {/each}
  </FormGroup>

  <Row>
    <Col xs="auto">
    <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
        {#if !processing}
        Authenticate
        {:else}
        Authenticating...
        {/if}
    </Button>
    </Col>
    {#if processing}
    <Col xs="auto">
    <Spinner color="primary" type="border" size="md"/>
    </Col>
    {/if}
    <Col xs="auto">
      <Button on:click={fetchData} color="primary" style="width:fit-content" disabled={processing} type="button">
          {#if !processing}
          Fetch Data
          {:else}
          Fetching...
          {/if}
      </Button>
    </Col>
  </Row>
</form>
<span class="text-danger">{fetchError}</span>
