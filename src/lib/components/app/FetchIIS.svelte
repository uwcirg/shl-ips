<script lang="ts">
  import {
    Button,
    Col,
    FormGroup,
    Input,
    Label,
    Row,
    Spinner
  } from 'sveltestrap';

  import type { ResourceRetrieveEvent } from '$lib/utils/types';
  import { createEventDispatcher } from 'svelte';
  import { API_BASE } from '$lib/config';
  import {
    constructPatientResource
  } from '$lib/utils/util';
  import StateInput from '$lib/components/StateInput.svelte';
  import GenderInput from '$lib/components/GenderInput.svelte';

  const resourceDispatch = createEventDispatcher<{ 'update-resources': ResourceRetrieveEvent }>();

  let defaultUrl = 'https://35.160.125.146:8039/fhir/Patient';
  let processing = false;
  let fetchError = '';

  let mrn = '123456789';
  let first = 'Zhang';
  let last = 'Wei';
  let dob = '1986-02-28';
  let address1 = '1959 NE Pacific St';
  let address2 = '';
  let city = 'Seattle';
  let state = 'WA';
  let zip = '98195';
  let phone = '(555) 555-5555';
  let gender:string = 'Male';

  let result: ResourceRetrieveEvent = {
    resources: undefined
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

  async function fetchIIS(patient: any) {
    return await fetch(`${API_BASE}/iis`, {
      method: 'POST',
      headers: { accept: 'application/json' },
      body: JSON.stringify(patient)
    }).then(function (response: any) {
      if (!response.ok) {
        // make the promise be rejected if we didn't get a 2xx response
        throw new Error('Unable to fetch IIS immunization data', { cause: response });
      } else {
        return response;
      }
    });
  }

  async function prepareIps() {
    fetchError = '';
    processing = true;
    try {
      let content;
      let hostname;
      const contentResponse = await fetchIIS(constructPatientResource());
      content = await contentResponse.json();
      hostname = 'WA IIS';
      processing = false;
      let resources = content.entry.map((e) => {
        return e.resource;
      })
      result = {
        resources: resources,
        source: hostname
      };
      console.log(resources);
      resourceDispatch('update-resources', result);
    } catch (e) {
      processing = false;
      console.log('Failed', e);
      fetchError = 'Error preparing IPS';
    }
  }
</script>

<form on:submit|preventDefault={() => prepareIps()}>
  <FormGroup>
    <Label>Enter your information to fetch immunizations from WA IIS</Label>
    <p class="text-secondary"><em>WA Health Summary does not save this information</em></p>
    <Row cols={{ md: 2, sm: 1 }}>
      <Col>
        <Label>Name</Label>
        <FormGroup style="font-size:small" class="text-secondary" label="First">
          <Input type="text" bind:value={first} />
        </FormGroup>
        <FormGroup style="font-size:small" class="text-secondary" label="Last">
          <Input type="text" bind:value={last} />
        </FormGroup>
        <Label>Demographics</Label>
        <FormGroup style="font-size:small" class="text-secondary" label="Date of Birth">
          <Input type="date" bind:value={dob} placeholder={dob} style="width: 165px"/>
        </FormGroup>
        <FormGroup style="font-size:small" class="text-secondary" label="Gender">
          <GenderInput bind:value={gender} />
        </FormGroup>
        <FormGroup>
          <Label>MRN</Label>
          <Input type="text" bind:value={mrn} style="width: 165px"/>
        </FormGroup>
        <Label>Contact Information</Label>
        <FormGroup style="font-size:small" class="text-secondary" label="Phone">
          <Input type="tel" bind:value={phone} style="width: 165px"/>
        </FormGroup>
        <Label>Address</Label>
        <FormGroup style="font-size:small" class="text-secondary" label="Address Line 1">
          <Input type="text" bind:value={address1} />
        </FormGroup>
        <FormGroup style="font-size:small" class="text-secondary" label="Address Line 2 (Optional)">
          <Input type="text" bind:value={address2} />
        </FormGroup>
        <FormGroup style="font-size:small" class="text-secondary" label="City">
          <Input type="text" bind:value={city} />
        </FormGroup>
        <Row>
          <Col xs="auto">
            <FormGroup style="font-size:small" class="text-secondary" label="State">
              <StateInput bind:value={state} />
            </FormGroup>
          </Col>
          <Col>
            <FormGroup style="font-size:small" class="text-secondary" label="Zip">
              <Input type="text" bind:value={zip} style="width:90px"/>
            </FormGroup>
          </Col>
        </Row>
      </Col>
    </Row>
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
      <Col xs="auto" class="d-flex align-items-center px-0">
        <Spinner color="primary" type="border" size="md"/>
      </Col>
    {/if}
  </Row>
</form>

<span class="text-danger">{fetchError}</span>
