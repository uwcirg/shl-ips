<script lang="ts">
  import {
    Button,
    Col,
    FormGroup,
    Input,
    Label,
    Row,
    Spinner } from 'sveltestrap';

  import { SOF_HOSTS } from '$lib/config/config';
  import type { ResourceRetrieveEvent, SOFAuthEvent, SOFHost } from '$lib/utils/types';
  import type { Resource } from 'fhir/r4';
  import { authorize, endSession, getResourcesWithReferences } from '$lib/utils/sofClient.js';
  import { createEventDispatcher, onMount } from 'svelte';
  import { clearURLOfParams, getResourcesFromIPS } from '$lib/utils/util';
  import { page } from '$app/stores';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';

  // For "quick sample" in demo
  import { EXAMPLE_IPS, IPS_DEFAULT } from '$lib/config/config';

  // Demo quick sample loader
  let defaultUrl = EXAMPLE_IPS[IPS_DEFAULT];
  
  const authDispatch = createEventDispatcher<{'sof-auth-init': SOFAuthEvent; 'sof-auth-fail': SOFAuthEvent}>();
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  const CATEGORY = "provider-health-record";
  const METHOD = "provider-health-record-sof";
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;

  let processing = false;
  let loadingSample = false;
  let fetchError = "";
  let result: ResourceRetrieveEvent = {
    resources: undefined,
    category: CATEGORY,
    method: METHOD,
    source: undefined
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
          sessionStorage.setItem('AUTH_METHOD', 'sof');
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
        let sofHostAuthd = SOF_HOSTS.find(e => e.url == url);
        if (sofHostAuthd) {
          sofHost = sofHostAuthd;
          sofHostSelection = sofHost.id;
          await fetchData();
        }
      }
    }
  });

  async function fetchData() {
    processing = true;
    try {
      let retrievedResources = await getResourcesWithReferences(1);
      const isIps = (e) => e.resourceType === 'Bundle' && e.type === 'document'; 
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
        source: sofHost?.url,
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

  async function quickLoad() {
    fetchError = "";
    loadingSample = true;
    try {
      let content;
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
      let resources = await getResourcesFromIPS(content);
      loadingSample = false
      result = {
        resources,
        category: CATEGORY,
        method: METHOD,
        source: defaultUrl,
        sourceName: 'Quick Sample'
      };
      resourceDispatch('update-resources', result);
    } catch (e) {
      loadingSample = false;
      console.log('Failed', e);
      fetchError = "Error preparing IPS";
    }
  }
</script>
<form on:submit|preventDefault={() => FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, sofHost.name, prepareIps)}>
  <FormGroup>
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
      outline
      style="width:fit-content"
      disabled={processing || loadingSample}
      type="button"
      on:click={() => FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, defaultUrl, quickLoad)}>
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
<FHIRDataServiceChecker bind:this={FHIRDataServiceCheckerInstance}/>
<span class="text-danger">{fetchError}</span>
