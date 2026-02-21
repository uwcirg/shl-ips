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
  import type { IAuthService, ResourceRetrieveEvent, SOFAuthEvent, SOFHost } from '$lib/utils/types';
  import { clearURLOfParams, getReferences } from '$lib/utils/util';
  import { authorize, endSession } from '$lib/utils/sofClient.js';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { BundleEntry, Resource } from 'fhir/r4';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';
  import { METHODS, CATEGORIES } from '$lib/config/tags';

  export let disabled = false;

  let authService: IAuthService = getContext('authService');
  
  const authDispatch = createEventDispatcher<{'sof-auth-init': SOFAuthEvent; 'sof-auth-fail': SOFAuthEvent}>();
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  const CATEGORY = CATEGORIES.PROVIDER_HEALTH_RECORD;
  const METHOD = METHODS.PROVIDER_HEALTH_RECORD_CARINBB;
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;

  let processing = false;
  let loadingSample = false;
  let fetchError = "";
  let result: ResourceRetrieveEvent = {
    resources: undefined,
    category: CATEGORY,
    method: METHOD,
    source: undefined,
    sourceName: undefined
  };

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
          authorize(sofHost.url, sofHost.clientId, scope);
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

  async function getResourcesWithReferences(resources: Resource[], depth=1, token=undefined) {
    let allResources = JSON.parse(JSON.stringify(resources));
    let referenceMap = {} as {[key: string]: boolean};
    let retrievedResources = {} as {[key: string]: boolean};
    while (resources.length > 0 && depth > 0) {
      for (let resource of resources) {
        let retrieved = `${resource.resourceType}/${resource.id}`;
        retrievedResources[retrieved] = true;
        let refs = getReferences(resource);
        for (let i=0; i<refs.length; i++) {
          referenceMap[refs[i]] = true;
        }
      }
      let referencedResources = Object.keys(referenceMap);
      let referencedResourcesToFetch = referencedResources.filter(x => {
        return (!(x in retrievedResources) && CARIN_RESOURCES.indexOf(x.split('/')[0]) >= 0);
      });
      let headers: HeadersInit = {};
      if (token) {
        headers.authorization = `Bearer ${token}`;
      }
      resources = (await Promise.allSettled(referencedResourcesToFetch.map(reference => {
        return fetch(`${sofHost!.url}/${reference}`, {
          headers: headers
        }).then(response => response.json());
      }))).filter(x => x.status == "fulfilled").map(x => x.value);
      allResources = allResources.concat(...resources);
      referenceMap = {};
      depth--;
    }
    return allResources;
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
        const code_verifier = token.codeVerifier;

        const url = token.serverUrl;
        let sofHostAuthd = CARIN_HOSTS.find(e => e.url == url);
        if (!sofHostAuthd) {
          throw Error(`No registered SMART host found matching ${url}`);
        }

        sofHost = sofHostAuthd;
        sofHostSelection = sofHost.id;

        // Send the code to the server for token exchange
        let tokenResult = await fetch(`/api/carin/${sofHostSelection}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await authService.getAccessToken()}`,
          },
          body: JSON.stringify({ code, code_verifier }),
        })
          .then(response => response.text())
          .then(response => JSON.parse(response));
        const accessToken = tokenResult.access_token;
        const patientId = tokenResult.patient;
        console.log('Access Token:', accessToken);

        let patient = await fetch(`${url}/Patient/${patientId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then(response => response.json())
          .then(patientData => {
            console.log('Patient Data:', patientData);
            return patientData;
          });
            
        let resources = (await Promise.allSettled(CARIN_RESOURCES.map((resourceType: string) => {
          return fetch(`${url}/${resourceType}?patient=${patientId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
            .then(response => response.json())
            .then(data => {
              console.log(`${resourceType} Data:`, data);
              if (data.resourceType === 'Bundle') {
                return data.entry.map((e: BundleEntry) => e.resource);
              } else if (CARIN_RESOURCES.includes(data.resourceType)) {
                return [data];
              }
              throw Error (`Unexpected resource type ${data.resourceType}`);
            });
        }))).filter(x => x.status == "fulfilled").map(x => x.value);

        resources = resources.flat();
        resources = [patient, ...resources];
        if (resources) {
          result = {
            resources: await getResourcesWithReferences(resources, 1, accessToken),
            category: CATEGORY,
            method: METHOD,
            source: sofHost?.url,
            sourceName: sofHost?.name
          };
          console.log(result.resources);
          resourceDispatch('update-resources', result);
        }

        console.log(result);
      } catch (e) {
        console.log('Failed', e);
        fetchError = "Error fetching Insurance data";
      } finally {
        processing = false;
        window.history.replaceState(null, "", clearURLOfParams($page.url));
        endSession();
      }
    }
  });

</script>
<form on:submit|preventDefault={() => FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, METHOD, sofHost?.url, prepareIps)}>
  <FormGroup>
    {#each CARIN_HOSTS as host}
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
      {#if !processing}
        Fetch Data
      {:else}
        Fetching...
      {/if}
    </Button>
    </Col>
    {#if processing || loadingSample}
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
