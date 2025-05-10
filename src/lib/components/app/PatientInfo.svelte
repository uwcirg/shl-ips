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
  import { createEventDispatcher } from 'svelte';
  import { constructPatientResource } from '$lib/utils/util';
  import GenderInput from '$lib/components/form/GenderInput.svelte';
  import CountryInput from '$lib/components/form/CountryInput.svelte';
  import type { ResourceRetrieveEvent } from '$lib/utils/types';
  import type { Patient } from 'fhir/r4';

  export let patient: Patient | undefined;
  $: {
    if (patient) {
      first = patient.name?.[0].given?.[0] ?? '';
      last = patient.name?.[0].family ?? '';
      dob = patient.birthDate ?? '';
      gender = patient.gender ?? '';
      mrn = patient.identifier?.find((i) => i.type?.coding?.[0].code === 'MR')?.value ?? '';
      phone = patient.telecom?.find((t) => t.system === 'phone')?.value ?? '';
      email = patient.telecom?.find((t) => t.system === 'email')?.value ?? '';
      country = patient.address?.[0].country ?? '';
      culture = patient.extension?.find((e) => e.url === 'http://healthintersections.com.au/fhir/StructureDefinition/patient-cultural-background')?.valueCodeableConcept?.coding?.[0].code ?? '';
      community = patient.extension?.find((e) => e.url === 'http://hl7.org.au/fhir/StructureDefinition/community-affiliation')?.valueCodeableConcept?.coding?.[0].code ?? '';
      pronouns = patient.extension?.find((e) => e.url === 'http://hl7.org/fhir/StructureDefinition/individual-pronouns')?.valueCodeableConcept?.coding?.[0].code ?? '';
      sexCharacteristics = patient.extension?.find((e) => e.url === 'http://hl7.org.au/fhir/StructureDefinition/sex-characteristic-variation')?.valueCodeableConcept?.coding?.[0].code ?? '';
      religion = patient.extension?.find((e) => e.url === 'http://hl7.org/fhir/StructureDefinition/patient-religion')?.valueCodeableConcept?.coding?.[0].code ?? '';
    }
  }

  let processing = false;
  let fetchError = '';

  let first = '';
  let last = '';
  let dob = '';
  let gender = '';
  let mrn = '';
  let phone = '';
  let email = '';
  let country = '';

  let pronounOptions = [
    '', 'He/Him', 'She/Her', 'They/Them'
  ];
  let pronouns = '';

  let sexCharacteristicOptions = [
    '',
    'I have typical characteristics for my sex',
    'I have variations from typical characteristics',
    'Not sure'
  ]
  let sexCharacteristics = '';

  let culture = '';
  let community = '';


  let religionOptions = [
    '', 'Not Important', 'Buddhist', 'Catholic', 'Christian', 'Hindu', 'Jewish', 'Muslim', 'Other'
  ];
  let religion = '';
  let religionDetails = '';

  let preferredLanguage = '';
  let spokenLanguages = '';
  
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  function prepareIps() {
    const resources = constructPatientResource({
      first,
      last,
      dob,
      gender,
      mrn,
      phone,
      email,
      country,
      pronouns,
      sexCharacteristics,
      culture,
      community,
      religion,
      religionDetails,
      preferredLanguage,
      spokenLanguages
    });
    resourceDispatch('update-resources', resources);
  }

  
</script>

<form on:submit|preventDefault={() => prepareIps()}>
  <h5>Patient Details</h5>
  <Row>
    <Col>
      <FormGroup style="font-size:small" class="text-secondary" label="First Name">
        <Input type="text" bind:value={first} />
      </FormGroup>
    </Col>
  </Row>
  <FormGroup style="font-size:small" class="text-secondary" label="Last Name">
    <Input type="text" bind:value={last} />
  </FormGroup>
  <Row>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Date of Birth">
        <Input type="date" bind:value={dob} placeholder={dob} style="width: 165px"/>
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="National Health Identifier / MRN">
        <Input type="text" bind:value={mrn} style="width: 165px" />
      </FormGroup>
    </Col>
  </Row>
  <Row>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Phone">
        <Input type="tel" bind:value={phone} style="width: 165px"/>
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Email">
        <Input type="text" bind:value={email} style="width: 250px"/>
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Country">
        <CountryInput bind:value={country} />
      </FormGroup>
    </Col>
  </Row>
  <h5>Gender Identity</h5>
  <Row>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Gender">
        <GenderInput bind:value={gender} />
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Pronouns">
        <Input type="select" bind:value={pronouns} style="width: 165px">
          {#each pronounOptions as option}
            <option value={option} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              {option}
            </option>
          {/each}
        </Input>
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Sex Characteristics">
        <Input type="select" bind:value={sexCharacteristics} style="width: 165px">
          {#each sexCharacteristicOptions as option}
            <option value={option} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              {option}
            </option>
          {/each}
        </Input>
      </FormGroup>
    </Col>
  </Row>
  <h5>Cultural Identity</h5>
  <Row>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Your Culture">
        <Input type="text" bind:value={culture} style="width: 250px"/>
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Your Place (country/community)">
        <Input type="text" bind:value={community} style="width: 250px"/>
      </FormGroup>
    </Col>
  </Row>
  <Row>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Preferred Language">
        <Input type="text" bind:value={preferredLanguage} style="width: 250px"/>
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Additional Languages You Understand">
        <Input type="text" bind:value={spokenLanguages} style="width: 250px"/>
      </FormGroup>
    </Col>
  </Row>

  <FormGroup style="font-size:small" class="text-secondary">
    <Row>
      <Col xs="auto">
        <Input type="select" bind:value={religion} style="width: 250px">
          {#each religionOptions as option}
            <option value={option} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              {option}
            </option>
          {/each}
        </Input>
        <Label>Religion</Label>
      </Col>
      <Col xs="auto">
        <Input type="text" bind:value={religionDetails} style="width: 250px"/>
        <Label>Religion Detail</Label>
      </Col>
    </Row>
  </FormGroup>
  <Row>
    <Col xs="auto">
      <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
        {#if !processing}
          Update your patient information
        {:else}
          Adding...
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
