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
  import { authorize, getResourcesWithReferences } from './sofClient.js';
  import { createEventDispatcher, onMount } from 'svelte';
  
  const authDispatch = createEventDispatcher<{'sof-auth-init': SOFAuthEvent; 'sof-auth-fail': SOFAuthEvent}>();
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();
  let processing = false;
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
          authorize(sofHost.url, sofHost.clientId);
          authDispatch('sof-auth-init');
        } catch (e) {
          authDispatch('sof-auth-fail')
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
    } catch (e) {
      processing = false;
      endSession();
    }
  }

</script>
<form on:submit|preventDefault={() => prepareIps()}>
  <FormGroup>
      <Label>Fetch US Core data via SMART authorization</Label>
    {#each SOF_HOSTS as host}
      <Input type="radio" bind:group={sofHostSelection} value={host.id} label={host.name} style="border-top: 1px; border-color: black"/>
      {#if host.note}
        <p class="text-secondary" style="margin-left:25px">{@html host.note}</p>
      {/if}
    {/each}
  </FormGroup>

  <Row>
    <Col xs="auto">
    <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
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
