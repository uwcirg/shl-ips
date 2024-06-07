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

  import type { ResourceRetrieveEvent } from './types';
  import { createEventDispatcher } from 'svelte';
  import { constructResourceUrl } from './sofClient';
  import { SOF_PATIENT_RESOURCES } from './config';

  const resourceDispatch = createEventDispatcher<{ 'update-resources': ResourceRetrieveEvent }>();

  let sources = {
    Meld: {selected: false, destination: "Meld", url: "https://gw.interop.community/HeliosConnectathonSa/open"},
    JMCHelios: {selected: false, destination: "JMCHelios", url: "https://gw.interop.community/JMCHeliosSTISandbox/open"},
    PublicHapi: {selected: false, destination: "PublicHapi", url: "http://hapi.fhir.org/baseR4"},
    OpenEpic: {selected: false, destination: "OpenEpic", url: ""},
    CernerHelios: {selected: false, destination: "CernerHelios", url: ""}
  }

  let baseUrl = "https://concept01.ehealthexchange.org:52780/fhirproxy/r4";
  let selectedSource = "Meld";
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
  let phone = '';
  let gender:string = '';
  let genders: Record<string, any> = {
    "Female": 'female',
    "Male": 'male',
    "Other": 'other'
  };
  let states: Array<string> = [
    'AL','AK','AZ','AR','CA','CO','CT',
    'DC','DE','FL','GA','GU','HI','ID',
    'IL','IN','IA','KS','KY','LA','ME',
    'MD','MA','MI','MH','MN','MP','MS',
    'MO','MT','NE','NV','NH','NJ','NM',
    'NY','NC','ND','OH','OK','OR','PA',
    'PR','RI','SC','SD','TN','TX','UT',
    'VT','VA','VI','WA','WV','WI','WY'
  ];

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
      phone = '';
      gender = '';
      if (selectedSource === 'Meld') {
        last = "BLACKSTONE";
        first = "VERONICA";
        gender = "Female";
        dob = "1998-06-18";
      } else if (selectedSource === 'JMCHelios') {
        last = "JMC";
        first = "Chlamydia";
        gender = "Male";
        dob = "2001-05-07";
      } else if (selectedSource === 'OpenEpic') {
        last = "Lopez";
        first = "Camila";
        gender = "Female";
        dob = "1987-09-12";
      } else if (selectedSource === 'CernerHelios') {
        last = "Hill";
        first = "Cucumber";
        gender = "Female";
        dob = "2023-08-29";
      } else if (selectedSource === 'PublicHapi') {
        last = "Sanity";
        first = "TestforPatientR4";
        gender = "Male";
        dob = "1919-11-03";
        city = "Pune";
        state = "MH";
      }
    }
  }

  $: {
    if (method) {
      if (method === 'url' && selectedSource &&sources[selectedSource].url === "") {
        selectedSource = "";
      }
    }
  }

  function constructPatient() {
    let patient = {
      resourceType: 'Patient',
      identifier: [
        {
          use: 'usual',
          type: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                code: 'MR',
                display: 'Medical Record Number'
              }
            ],
            text: 'Medical Record Number'
          },
          system: 'http://hospital.smarthealthit.org',
          value: mrn
        }
      ],
      active: true,
      name: [
        {
          family: last,
          given: [first]
        }
      ],
      telecom: [
        {
          system: 'phone',
          value: phone,
          use: 'home'
        }
      ],
      gender: genders[gender],
      birthDate: dob,
      address: [
        {
          line: (address2 ? [address1, address2] : [address1]),
          city: city,
          state: state,
          postalCode: zip,
          country: 'US'
        }
      ]
    };

    return patient;
  }

  function buildPatientSearchQuery() {
    let query = "?";
    query += dob ? `birthdate=${dob}&` : '';
    query += first ? `given=${first}&` : '';
    query += last ? `family=${last}&` : '';
    query += gender ? `gender=${genders[gender]}&` : '';
    query += mrn ? `identifier=${mrn}&` : '';
    query += phone ? `phone=${phone}&` : '';
    query += address1 || address2 ? `address=${(address1+' '+address2).trim().replaceAll(' ', '+')}&` : '';
    query += city ? `address-city=${city}&` : '';
    query += state ? `address-state=${state}&` : '';
    query += zip ? `address-postalcode=${zip}&` : '';
    query = query.substring(0, query.length - 1);
    return query;
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
      headers['X-Request-Id'] = '5c92758f-79c8-4137-b104-9c0064205407',
      headers['X-DESTINATION'] = selectedSource,
      headers['X-POU'] = 'PUBHLTH'
    }
    
    let query = buildPatientSearchQuery();
    result = await fetch(`${url}/Patient${query}`, {
      method: 'GET',
      headers: headers
    }).then(function (response: any) {
      if (!response.ok) {
        // make the promise be rejected if we didn't get a 2xx response
        throw new Error('Unable to fetch patient data', { cause: response });
      } else {
        return response;
      }
    });
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
    let headers = {
      'Accept': 'application/json+fhir',
      'Content-Type': 'application/fhir+json; charset=UTF-8',
      'prefer': 'return=representation'
    };
    if (method === 'url') {
      url = sources[selectedSource].url;
    } else if (method === 'destination') {
      headers['X-Request-Id'] = '5c92758f-79c8-4137-b104-9c0064205407',
      headers['X-DESTINATION'] = selectedSource,
      headers['X-POU'] = 'PUBHLTH'
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
          if (r.total == 0) {
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
      const patient = await fetchPatient(constructPatient());
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
    <p class="text-secondary"><em>WA Verify+ does not save this information</em></p>
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
          <!-- <Label>Gender</Label> -->
          <Input type="select" bind:value={gender} style="width: 100px">
            {#each Object.keys(genders) as full}
              <option value={full} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                {full}
              </option>
            {/each}
          </Input>
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
              <Input type="select" bind:value={state} style="width: 80px">
                {#each states as state}
                  <option value={state} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                    {state}
                  </option>
                {/each}
              </Input>
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
  {/if}
</form>

<span class="text-danger">{fetchError}</span>
