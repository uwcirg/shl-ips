<script lang="ts">
  import {
    Button,
    Col,
    FormGroup,
    Input,
    Label,
    Row,
    Spinner } from 'sveltestrap';

  import { CARIN_HOSTS, CARIN_RESOURCES } from '$lib/config';
  import type { ResourceRetrieveEvent, SOFAuthEvent, SOFHost } from '$lib/utils/types';
  import { getReferences } from '$lib/utils/util';
  import { authorize } from '$lib/utils/sofClient.js';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { BundleEntry, Resource } from 'fhir/r4';
  
  const authDispatch = createEventDispatcher<{'sof-auth-init': SOFAuthEvent; 'sof-auth-fail': SOFAuthEvent}>();
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();
  let processing = false;
  let loadingSample = false;
  let fetchError = "";
  let result: ResourceRetrieveEvent = {
    resources: undefined
  };

  let sofHostSelection = CARIN_HOSTS[0].id;
  let sofHost:SOFHost | undefined = CARIN_HOSTS.find(e => e.id == sofHostSelection);
  
  $: {
    if (sofHostSelection) {
      sofHost = CARIN_HOSTS.find(e => e.id == sofHostSelection);
    }
  }

  async function prepareIps() {
    fetchError = "";
    try {
      if (sofHost) {
        try {
          sessionStorage.setItem('AUTH_METHOD', 'carinbb');
          authorize(sofHost.url, sofHost.clientId);
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

  async function getResourcesWithReferences(resources: Resource[], token: string, depth=1) {
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
      resources = (await Promise.allSettled(referencedResourcesToFetch.map(reference => {
        return fetch(`${sofHost!.url}/${reference}`, {
          headers: { Authorization: `Bearer ${token}` }
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
      sessionStorage.removeItem('AUTH_METHOD');

      let key = sessionStorage.getItem('SMART_KEY');
      if (key) {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (!code) {
          throw Error('No code found in authentication response url');
        }
        let token = sessionStorage.getItem(JSON.parse(key));
        if (token) {
          let url = JSON.parse(token).serverUrl;
          let sofHostAuthd = CARIN_HOSTS.find(e => e.url == url);
          if (sofHostAuthd) {
            sofHost = sofHostAuthd;
            sofHostSelection = sofHost.id;

            sessionStorage.removeItem(key);
            sessionStorage.removeItem('SMART_KEY');
            // Send the code to your server for token exchange
            let tokenResult = await fetch(`/api/${sofHostSelection}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
            })
              .then(response => response.json());
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
                
            let resources = (await Promise.allSettled(["ExplanationOfBenefit"].map((resourceType: string) => {
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
              result = { resources: await getResourcesWithReferences(resources, accessToken) };
              console.log(result.resources);
              resourceDispatch('update-resources', result);
            }

            console.log(result);
          }
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

</script>
<form on:submit|preventDefault={() => prepareIps()}>
  <FormGroup>
      <Label>Fetch US Core data via SMART authorization</Label>
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
    <Button color="primary" style="width:fit-content" disabled={processing || loadingSample} type="submit">
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
  </Row>
</form>
<span class="text-danger">{fetchError}</span>
