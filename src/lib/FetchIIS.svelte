<script lang="ts">
  import {
    Button,
    Col,
    Dropdown,
    DropdownMenu,
    DropdownItem,
    DropdownToggle,
    FormGroup,
    Icon,
    Input,
    Label,
    Row,
    Spinner
  } from 'sveltestrap';

  import type { ResourceRetrieveEvent } from './types';
  import { createEventDispatcher } from 'svelte';
  import { API_BASE } from './config';

  const resourceDispatch = createEventDispatcher<{ 'update-resources': ResourceRetrieveEvent }>();

  let defaultUrl = 'https://35.160.125.146:8039/fhir/Patient';
  let processing = false;
  let fetchError = '';
  let isGenderOpen = false;
  let isStateOpen = false;

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

  let summaryUrlValidated: URL | undefined = undefined;
  $: {
    setSummaryUrlValidated(defaultUrl);
  }
  $: genderIcon = isGenderOpen ? 'chevron-up' : 'chevron-down';
  $: stateIcon = isStateOpen ? 'chevron-up' : 'chevron-down';

  function setSummaryUrlValidated(url: string) {
    try {
      summaryUrlValidated = new URL(url);
    } catch {
      summaryUrlValidated = undefined;
    }
  }

  function setGender(g: string) {
    gender = g;
  }

  function constructPatient() {
    let patient = {
      resourceType: 'Patient',
      id: 'zhang-wei-himss-2024',
      meta: {
        profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient']
      },
      extension: [
        {
          extension: [
            {
              url: 'ombCategory',
              valueCoding: {
                system: 'urn:oid:2.16.840.1.113883.6.238',
                code: '2028-9',
                display: 'Asian'
              }
            },
            {
              url: 'text',
              valueString: 'Asian'
            }
          ],
          url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
        },
        {
          extension: [
            {
              url: 'ombCategory',
              valueCoding: {
                system: 'urn:oid:2.16.840.1.113883.6.238',
                code: '2186-5',
                display: 'Not Hispanic or Latino'
              }
            },
            {
              url: 'text',
              valueString: 'Not Hispanic or Latino'
            }
          ],
          url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity'
        },
        {
          url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex',
          valueCode: genders[gender]
        },
        {
          url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-sex',
          valueCode: '248153007'
        }
      ],
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
      const contentResponse = await fetchIIS(constructPatient());
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
    <p class="text-secondary"><em>WA Verify+ does not save this information</em></p>
    <Row cols={{ md: 2, sm: 1 }}>
      <Col>
        <Label>Name</Label>
        <FormGroup style="font-size:small" label="First">
          <Input type="text" bind:value={first} />
        </FormGroup>
        <FormGroup style="font-size:small" label="Last">
          <Input type="text" bind:value={last} />
        </FormGroup>
        <Label>Demographics</Label>
        <FormGroup style="font-size:small" label="Date of Birth">
          <Input type="date" bind:value={dob} placeholder={dob} style="width: 165px"/>
        </FormGroup>
        <FormGroup style="font-size:small" label="Gender">
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
        <FormGroup style="font-size:small" label="Phone">
          <Input type="tel" bind:value={phone} style="width: 165px"/>
        </FormGroup>
        <Label>Address</Label>
        <FormGroup style="font-size:small" label="Address Line 1">
          <Input type="text" bind:value={address1} />
        </FormGroup>
        <FormGroup style="font-size:small" label="Address Line 2 (Optional)">
          <Input type="text" bind:value={address2} />
        </FormGroup>
        <FormGroup style="font-size:small" label="City">
          <Input type="text" bind:value={city} />
        </FormGroup>
        <Row>
          <Col xs="auto">
            <FormGroup style="font-size:small" label="State">
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
            <FormGroup style="font-size:small" label="Zip">
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
      <Col xs="auto">
        <Spinner color="primary" type="border" size="md" />
      </Col>
    {/if}
  </Row>
</form>

<span class="text-danger">{fetchError}</span>
