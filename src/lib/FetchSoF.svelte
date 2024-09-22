<script lang="ts">
  import {
    Button,
    Col,
    FormGroup,
    Input,
    Label,
    Row,
    Spinner } from 'sveltestrap';

  import { SOF_HOSTS } from './config';
  import type { ResourceRetrieveEvent, SOFAuthEvent, SOFHost } from './types';
  import { authorize, getResourcesWithReferences, activePatient } from './sofClient.js';
  import { createEventDispatcher, onMount } from 'svelte';
  
  const authDispatch = createEventDispatcher<{'sof-auth-init': SOFAuthEvent; 'sof-auth-fail': SOFAuthEvent}>();
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();
  let processing = false;
  let loadingSample = false;
  let fetchError = "";
  let result: ResourceRetrieveEvent = {
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
        try {
          authorize(sofHost.url, sofHost.clientId);// , sofHost.clientSecret);
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
          sessionStorage.removeItem(key);
          sessionStorage.removeItem('SMART_KEY');
        }
      }
    }
  });

  function endSession() {
    let key = sessionStorage.getItem('SMART_KEY');
    if (key) {
      sessionStorage.removeItem(JSON.parse(key));
      sessionStorage.removeItem('SMART_KEY');
    }
  }

  async function fetchData() {
    processing = true;
    try {
      let resources = await getResourcesWithReferences(1);
      result.resources = resources;
      console.log(resources)
      processing = false;
      return resourceDispatch('update-resources', result);
    } catch (e: any) {
      console.log(e.message);
      fetchError = e.message;
      processing = false;
      endSession();
    }
  }

  // Demo quick sample loader
  import { EXAMPLE_IPS, IPS_DEFAULT } from './config';
  import type { IPSRetrieveEvent } from './types';
  let defaultUrl = EXAMPLE_IPS[IPS_DEFAULT];
  const ipsDispatch = createEventDispatcher<{'ips-retrieved': IPSRetrieveEvent}>();
  let ipsResult: IPSRetrieveEvent = {
    ips: undefined
  };
  async function quickLoad() {
    fetchError = "";
    loadingSample = true;
    try {
      let content;
      let hostname;
      const contentResponse = await fetch(defaultUrl!, {
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
      hostname = defaultUrl?.hostname;
      loadingSample = false
      ipsResult = {
        ips: content,
        source: hostname
      };
      ipsDispatch('ips-retrieved', ipsResult);
    } catch (e) {
      loadingSample = false;
      console.log('Failed', e);
      fetchError = "Error preparing IPS";
    }
  }
</script>
<form on:submit|preventDefault={() => prepareIps()}>
  <FormGroup>
      <Label>Fetch US Core data via SMART authorization</Label>
    {#each SOF_HOSTS as host}
      <Row class="mx-2">
        <Input type="radio" bind:group={sofHostSelection} value={host.id} label={host.name} />
        {#if host.note}
          <p class="text-secondary" style="margin-left:25px">{@html host.note}</p>
        {/if}
      </Row>
    {/each}
  </FormGroup>

  <Row>
    <Col xs="auto">
    <Button color="primary" style="width:fit-content" disabled={processing || loadingSample} type="submit">
      {#if !processing}
        Fetch Data
      {:else}
        Fetching...
      {/if}
    </Button>
    </Col>
    <Col xs="auto">
      <Button
      color="secondary"
      style="width:fit-content"
      disabled={processing || loadingSample}
      type="button"
      on:click={() => quickLoad()}>
        {#if !loadingSample}
          Quick Sample
        {:else}
          Loading...
        {/if}
      </Button>
    </Col>
  {#if processing || loadingSample}
    <Col xs="auto" class="d-flex align-items-center px-0">
      <Spinner color="primary" type="border" size="md"/>
    </Col>
  {/if}
  </Row>
</form>
<span class="text-danger">{fetchError}</span>
