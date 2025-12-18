<script lang="ts">
  import {
    Button,
    Col,
    FormGroup,
    Input,
    Label,
    Row,
    Spinner
  } from '@sveltestrap/sveltestrap';

  import type { ResourceRetrieveEvent } from '$lib/utils/types';
  import { createEventDispatcher } from 'svelte';
  import { constructResourceUrl } from '$lib/utils/sofClient';
  import { SOF_PATIENT_RESOURCES } from '$lib/config';
  import {
    constructPatientResource,
    buildPatientSearchQuery
  } from '$lib/utils/util';
  import StateInput from '$lib/components/form/StateInput.svelte';
  import GenderInput from '$lib/components/form/GenderInput.svelte';
  import CountryInput from '$lib/components/form/CountryInput.svelte';

  const resourceDispatch = createEventDispatcher<{ 'update-resources': ResourceRetrieveEvent }>();

  let sources: Record<string, {selected: Boolean; destination: string; url: string}> = {
    MeldOpen: {selected: false, destination: "MeldOpen", url: "https://gw.interop.community/HeliosConnectathonSa/open"},
    JMCHelios: {selected: false, destination: "JMCHelios", url: "https://gw.interop.community/JMCHeliosSTISandbox/open"},
    OSPHL_USECASE1: {selected: false, destination: "OSPHL_USECASE1", url: "https://gw.interop.community/OSPHLUseCase1/open"},
    CDC_SEP_HL7_Connectathon: {selected: false, destination: "CDC_SEP_HL7_Connectathon", url: "https://gw.interop.community/CDCSepHL7Connectatho/open"},
    // Patient no longer exists
    // PublicHapi: {selected: false, destination: "PublicHapi", url: "http://hapi.fhir.org/baseR4"},
    OpenEpic: {selected: false, destination: "OpenEpic", url: ""},
    CernerHelios: {selected: false, destination: "CernerHelios", url: ""}
  }

  let baseUrl = "https://concept01.ehealthexchange.org:52780/fhirproxy/r4";
  let selectedSource = "MeldOpen";
  let method = 'destination'; // url or destination
  let processing = false;
  let fetchError = '';

  let mrn = '';
  let first = '';
  let last = '';
  let dob = '';
  let address1 = '';
  let address2 = '';
  let city = '';
  let state = '';
  let zip = '';
  let country = '';
  let phone = '';
  let gender:string = '';

  let result: ResourceRetrieveEvent = {
    resources: undefined
  };

  $: {
    if (selectedSource) {
      mrn = '';
      first = '';
      last = '';
      dob = '';
      address1 = '';
      address2 = '';
      city = '';
      state = '';
      zip = '';
      country = '';
      phone = '';
      gender = '';
      if (selectedSource === 'MeldOpen') {
        last = "Blackstone";
        first = "Veronica";
        gender = "female";
        dob = "1998-06-18";
      } else if (selectedSource === 'JMCHelios') {
        last = "Quintana";
        first = "Lena";
        gender = "female";
        dob = "1955-05-21";
      } else if (selectedSource === 'OpenEpic') {
        last = "Lopez";
        first = "Camila";
        gender = "female";
        dob = "1987-09-12";
      } else if (selectedSource === 'CernerHelios') {
        last = "Hill";
        first = "Cucumber";
        gender = "female";
        dob = "2023-08-29";
      } else if (selectedSource === 'PublicHapi') {
        // Patient/test data no longer available
        last = "Sanity";
        first = "TestforPatientR4";
        gender = "male";
        dob = "1919-11-03";
        city = "Pune";
        state = "MH";
      } else if (selectedSource === 'OSPHL_USECASE1') {
        last = "Quintana";
        first = "Lena";
        gender = "female";
        dob = "1955-05-21";
      } else if (selectedSource === 'CDC_SEP_HL7_Connectathon') {
        last = "Shaw";
        first = "Linda";
        gender = "female";
        dob = "1982-07-23";
      }
    }
  }

  $: {
    if (method) {
      if (method === 'url' && selectedSource && sources[selectedSource].url === "") {
        selectedSource = "";
      }
    }
  }

  async function fetchPatient(patient: any) {
    let result;
    
    let url = baseUrl;
    let headers = {
      accept: 'application/json+fhir',
      'Content-Type': 'application/fhir+json; charset=UTF-8',
      'prefer': 'return=representation'
    };
    if (method === 'url') {
      url = sources[selectedSource].url;
    } else if (method === 'destination') {
      headers['X-Request-Id'] = '21143678-7bd5-4caa-bdae-ee35a409d4f2';
      headers['X-DESTINATION'] = selectedSource;
      headers['X-POU'] = (selectedSource === 'OpenEpic' ? 'TREAT' : 'PUBHLTH');
    }
    
    try {
      result = await fetch(`${url}/Patient/$match`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(patient)
      });
      if (!result.ok) {
        throw new Error('Unable to fetch patient data with $match', { cause: result });
      }
    } catch (error) {
      console.warn(error);
      let query = buildPatientSearchQuery(
        {
          first: first,
          last: last,
          gender: gender,
          dob: dob,
          mrn: mrn,
          phone: phone,
          address1: address1,
          address2: address2,
          city: city,
          state: state,
          zip: zip,
          country: country,
        }
      );
      result = await fetch(`${url}/Patient${query}`, {
        method: 'GET',
        headers: headers
      });
      if (!result.ok) {
        throw new Error('Unable to fetch patient data', { cause: result });
      }
    }

    let body = await result.json();
    if (body.resourceType == 'Bundle' && (body.total == 0 || body.entry.length === 0)) {
      throw new Error('Unable to find patient');
    }
    let patient_response = body.entry[body.entry.length - 1].resource;
    return patient_response;
  }

  async function fetchPatientData(patientId: any) {
    // let query = buildAdvanceDirectiveSearchQuery(patientId);
    let url = baseUrl;
    let headers: Record<string, string> = {
      'Accept': 'application/json+fhir',
      'Content-Type': 'application/fhir+json; charset=UTF-8',
      'prefer': 'return=representation'
    };
    if (method === 'url') {
      url = sources[selectedSource].url;
    } else if (method === 'destination') {
      headers['X-Request-Id'] = '21143678-7bd5-4caa-bdae-ee35a409d4f2';
      headers['X-DESTINATION'] = selectedSource;
      headers['X-POU'] = (selectedSource === 'OpenEpic' ? 'TREAT' : 'PUBHLTH');
    }

    let results = await Promise.allSettled(
      SOF_PATIENT_RESOURCES.map(
        function(resourceType: string) {
          let query = constructResourceUrl(resourceType, patientId, url);
          let result = fetch(
            query,
            {
              method: 'GET',
              headers: headers
            }
          ).then(
            function(response: any) {
              if (!response.ok) {
                // make the promise be rejected if we didn't get a 2xx response
                throw new Error('Unable to fetch patient data', { cause: response });
              }
              return response;
            }
          );
          return result;
        }
      )
    );
    let resultJson = await Promise.allSettled(results.filter(x => x.status == "fulfilled").map(x => x.value.json()));
    let resources = resultJson.filter(x => x.status == "fulfilled").map(x => x.value);
    resources = resources.map((r) => {
        if (r.resourceType === "Bundle") {
          if (r.total == 0 || !r.entry) {
            return [];
          } else {
            return r.entry.map(e => e.resource);
          }
        } else {
          return [r];
        }
    });
    resources = [].concat(...resources);
    return resources;
  }

  async function prepareIps() {
    fetchError = '';
    processing = true;
    try {
      let content;
      let hostname;
      const patient = await fetchPatient(constructPatientResource(
        {
          first: first,
          last: last,
          gender: gender,
          dob: dob,
          mrn: mrn,
          phone: phone,
          address1: address1,
          address2: address2,
          city: city,
          state: state,
          zip: zip,
          country: country,
        }
      ));
      const resources = await fetchPatientData(patient.id);
      hostname = baseUrl;
      processing = false;
      if (resources.length === 0) {
        console.warn(`No resources found for patient ${patient.id} at ${hostname} for ${selectedSource}`);
      }

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
  <Label>Fetch US Core data via TEFCA query</Label>
  <FormGroup>
    <Row>
      <Col>
        {#each Object.keys(sources) as source}
          <Row class="mx-2">
            <Input
              type="radio"
              disabled={method === 'url' && sources[source].url === ""}
              bind:group={selectedSource}
              value={sources[source].destination}
              label={source}
            />
          </Row>
        {/each}
      </Col>
      <Col>
        <FormGroup style="font-size:small" class="text-secondary" label="Method">
          <Input type="select" bind:value={method}>
            <option value='destination' style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              TEFCA Proxy Query
            </option>
            <option value='url' style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              Direct Query
            </option>
          </Input>
        </FormGroup>
        {#if method === 'destination'}
        <p style="font-size:small" class="text-danger">Please <a href="https://concept01.ehealthexchange.org:52780/" target="_blank" rel="noreferrer">click here</a> and trust the site in your browser to perform this proxied query</p>
        {/if}
      </Col>
    </Row>
  </FormGroup>
  {#if selectedSource}
  <FormGroup>
    <Label>Enter your information to locate your data</Label>
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
              <Input type="numeric" bind:value={zip} style="width:90px"/>
            </FormGroup>
          </Col>
          <Col xs="auto">
            <FormGroup style="font-size:small" class="text-secondary" label="Country">
              <CountryInput bind:value={country} />
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
  {/if}
</form>

<span class="text-danger">{fetchError}</span>
