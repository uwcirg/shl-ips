<script lang="ts">
  import {
    Button,
    Col,
    FormGroup,
    Input,
    Label,
    Row,
    Spinner } from '@sveltestrap/sveltestrap';
  import { page } from '$app/stores';
  import { getContext } from 'svelte';
  import { CARIN_HOSTS, CARIN_RESOURCES } from '$lib/config/config';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import type { IAuthService, ResourceRetrieveEvent, SOFAuthEvent, SOFHost } from '$lib/utils/types';
  import { clearURLOfParams, getReferences } from '$lib/utils/util';
  import { authorize, completeConfidentialClientAuth, endSession } from '$lib/utils/sofClient';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { BundleEntry, Resource } from 'fhir/r4';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';
  import { METHODS, CATEGORIES } from '$lib/config/tags';

  export let disabled = false;
  export let processing = false;
  
  let buttonText = "Import Data";
  let processingText = "Importing...";

  let authService: IAuthService = getContext('authService');
  
  const authDispatch = createEventDispatcher<{'sof-auth-init': SOFAuthEvent; 'sof-auth-fail': SOFAuthEvent}>();
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  const CATEGORY = CATEGORIES.PROVIDER_HEALTH_RECORD;
  const METHOD = METHODS.PROVIDER_HEALTH_RECORD_CARINBB;
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;

  let loadingSample = false;
  let fetchError = "";

  let sofHostSelection = CARIN_HOSTS[0].id;
  let sofHost:SOFHost | undefined = CARIN_HOSTS.find(e => e.id == sofHostSelection);
  
  $: {
    if (sofHostSelection) {
      sofHost = CARIN_HOSTS.find(e => e.id == sofHostSelection);
    }
  }
  
  $: {
    if (fetchError !== "") {
      processing = false;
      loadingSample = false;
    }
  }

  async function prepareIps() {
    fetchError = "";
    try {
      if (sofHost) {
        try {
          sessionStorage.setItem('AUTH_METHOD', 'carinbb');
          let scope;
          if (sofHost.scope) {
            scope = sofHost.scope;
          } else {
            const patientResourceScope = CARIN_RESOURCES.map(resourceType => `patient/${resourceType}.read`);
            const resourceScope = patientResourceScope.join(" ");
            scope = `openid fhirUser launch/patient ${resourceScope}`;
          }
          authorize(sofHost.url, sofHost.clientId, {scope, pkceMode: "disabled"});
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
    if (method) {
      if (method != 'carinbb') {
        return;
      }
      processing = true;
      sessionStorage.removeItem('AUTH_METHOD');
      try {
        let key = sessionStorage.getItem('SMART_KEY');
        if (!key) {
          throw Error('No SMART session key found in storage');
        }

        const code = $page.url.searchParams.get('code');
        if (!code) {
          throw Error('No code found in authentication response url');
        }

        let tokenString = sessionStorage.getItem(JSON.parse(key));
        if (!tokenString) {
          throw Error('No SMART token found in storage');
        }
        const token = JSON.parse(tokenString);

        const url = token.serverUrl;
        let sofHostAuthd = CARIN_HOSTS.find(e => e.url == url);
        if (!sofHostAuthd) {
          throw Error(`No registered SMART host found matching ${url}`);
        }

        sofHost = sofHostAuthd;
        sofHostSelection = sofHost.id;

        let authToken = await authService.getAccessToken();
        let resources = await completeConfidentialClientAuth(sofHost.id, CARIN_RESOURCES, token, authToken!, code);
        if (resources) {
          let result = {
            resources,
            category: CATEGORY,
            method: METHOD,
            source: sofHost?.url,
            sourceName: sofHost?.name
          };
          console.log(result.resources);
          resourceDispatch('update-resources', result);
        }
      } catch (e) {
        processing = false;
        console.log('Failed', e);
        fetchError = "Error importing insurance data";
      } finally {
        window.history.replaceState(null, "", clearURLOfParams($page.url));
        endSession();
      }
    }
  });

</script>
<form on:submit|preventDefault={() => FHIRDataServiceCheckerInstance?.checkFHIRDataServiceBeforeFetch(CATEGORY, METHOD, sofHost?.url ?? "", prepareIps)}>
  <FormGroup>
    <h6>WA State Apple Health Providers</h6>
    {#each CARIN_HOSTS.filter(e => e.section === 'applehealth') as host}
      <Row class="mx-2">
        <Input type="radio" disabled={host.disabled ?? false} bind:group={sofHostSelection} value={host.id} label={host.name} />
        {#if host.note}
          <p class="text-secondary" style="margin-left:25px">{@html host.note}</p>
        {/if}
      </Row>
    {/each}
    <Row class="w-100 p-2 justify-content-end"><img src={`${INSTANCE_CONFIG.imgPath}/hca-logo.svg`} alt="HCA Logo" style="width: fit-content; height: 40px;" /></Row>
    <Row class="border-top w-100 p-2"><h6>Other Provider Test Systems</h6></Row>
    {#each CARIN_HOSTS.filter(e => !e.section || e.section === 'other') as host}
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
      <Button color="primary" style="width:fit-content" disabled={processing || disabled || loadingSample} type="submit">
        {processing ? processingText : buttonText}
      </Button>
    </Col>
    <Col xs="auto" class="d-flex align-items-center px-0">
      {#if disabled}
        Please wait...
      {:else if processing || loadingSample}
        <Spinner color="primary" type="border" size="md"/>
      {/if}
    </Col>
  </Row>
</form>
<FHIRDataServiceChecker bind:this={FHIRDataServiceCheckerInstance}/>

<span class="text-danger">{fetchError}</span>
