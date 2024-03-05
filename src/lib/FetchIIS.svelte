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
  let isOpen = false;

  let mrn = '123456789';
  let first = 'Zhang';
  let last = 'Wei';
  let dob = '02-28-1986';
  let address = '1959 NE Pacific St Seattle WA 98195';
  let phone = '';
  let gender:string = 'Male';
  let genders: Record<string, any> = {
    "Male": 'M',
    "Female": 'F',
    "Other": 'UN'
  };

  let result: ResourceRetrieveEvent = {
    resources: undefined
  };

  let summaryUrlValidated: URL | undefined = undefined;
  $: {
    setSummaryUrlValidated(defaultUrl);
  }
  $: genderIcon = isOpen ? 'chevron-up' : 'chevron-down';

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
      id: 'child-example',
      meta: {
        profile: ['http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient']
      },
      text: {
        status: 'generated',
        div: ''
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
          line: ['123 e fake st'],
          city: 'phoenix',
          state: 'AZ',
          postalCode: '85004',
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
    <Label>Fetch immunizations from WA IIS</Label>
    <FormGroup>
      <Label>First Name</Label>
      <Input type="text" bind:value={first} />
    </FormGroup>
    <FormGroup>
      <Label>Last Name</Label>
      <Input type="text" bind:value={last} />
    </FormGroup>
    <FormGroup>
      <Label>MRN</Label>
      <Input type="text" bind:value={mrn} />
    </FormGroup>
    <FormGroup>
      <Label>Date of Birth</Label>
      <Input type="date" bind:value={dob} />
    </FormGroup>
    <FormGroup>
      <Label>Phone</Label>
      <Input type="phone" bind:value={phone} />
    </FormGroup>
    <FormGroup>
      <Label>Address</Label>
      <Input type="text" bind:value={address} />
    </FormGroup>
    <FormGroup>
      <Label>Gender</Label>
      <Dropdown {isOpen} toggle={() => (isOpen = !isOpen)}>
        <DropdownToggle tag="div" class="d-inline-block">
          <div style="position:relative">
            <Input type="text" bind:value={gender} />
            <Icon
              name={genderIcon}
              style="position: absolute;
            cursor: pointer;
            height: 25px;
            width: 20px;
            top: 6px;
            right: 10px;
            color: rgb(50, 50, 50);"
            />
          </div>
        </DropdownToggle>
        <DropdownMenu style="width:auto">
          {#each Object.entries(genders) as [full, abb]}
            <DropdownItem
              style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
              on:click={() => {
                setGender(full);
              }}>{full}</DropdownItem
            >
          {/each}
        </DropdownMenu>
      </Dropdown>
    </FormGroup>
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
