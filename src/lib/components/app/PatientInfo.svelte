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
  import ReligionCodeInput from '$lib/components/form/ReligionCodeInput.svelte';
  import type { ResourceRetrieveEvent } from '$lib/utils/types';
  import type { Coding, Patient } from 'fhir/r4';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';

  export let patient: Patient | undefined;

  const CATEGORY = 'patient-story';
  const METHOD = 'patient-identity-form';
  const SOURCE = {
    url: window.location.origin,
    name: 'My Identities'
  };
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;

  let myPatient;
  $: myPatient = JSON.parse(JSON.stringify(patient));
  $: {
    if (myPatient) {
      first = myPatient.name?.[0].given?.[0] ?? '';
      last = myPatient.name?.[0].family ?? '';
      dob = myPatient.birthDate ?? '';
      gender = myPatient.gender ?? '';
      mrn = myPatient.identifier?.find((i) => i.type?.coding?.[0].code === 'MR')?.value ?? '';
      phone = myPatient.telecom?.find((t) => t.system === 'phone')?.value ?? '';
      email = myPatient.telecom?.find((t) => t.system === 'email')?.value ?? '';
      country = myPatient.address?.[0].country ?? '';
      culture = myPatient.extension?.find((e) => e.url === 'http://healthintersections.com.au/fhir/StructureDefinition/patient-cultural-background')?.valueCodeableConcept?.coding?.[0].code ?? '';
      community = myPatient.extension?.find((e) => e.url === 'http://hl7.org.au/fhir/StructureDefinition/community-affiliation')?.valueCodeableConcept?.coding?.[0].code ?? '';
      let pronounsCoding = myPatient.extension?.find((e) => e.url === 'http://hl7.org/fhir/StructureDefinition/individual-pronouns')?.valueCodeableConcept?.coding?.[0] ?? '';
      pronouns = Object.values(pronounOptions).find((v) => v?.code === pronounsCoding?.code) ?? pronounsCoding;
      let sexCharacteristicsCoding = myPatient.extension?.find((e) => e.url === 'http://hl7.org.au/fhir/StructureDefinition/sex-characteristic-variation')?.valueCodeableConcept?.coding?.[0] ?? '';
      sexCharacteristics = Object.values(sexCharacteristicOptions).find((v) => v?.code === sexCharacteristicsCoding?.code) ?? sexCharacteristicsCoding;
      let religionCoding = myPatient.extension?.find((e) => e.url === 'http://hl7.org/fhir/StructureDefinition/patient-religion')?.valueCodeableConcept?.coding?.[0] ?? '';
      religion = Object.values(religionOptions).find((p) => p?.code === religionCoding?.code) ?? religionCoding;
      preferredLanguage = myPatient.communication?.find((e) => e.preferred)?.language?.text ?? '';
      spokenLanguages = myPatient.communication?.filter((e) => !e.preferred).map((e) => e.language.text).join(', ') ?? '';
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

  let pronounOptions = {
    '': undefined,
    'She/Her': {
      system: 'http://loinc.org',
      code: 'LA29519-8',
      display: 'she/her/her/hers/herself'
    },
    'He/Him': {
      system: 'http://loinc.org',
      code: 'LA29518-0',
      display: 'he/him/his/his/himself'
    },
    'They/Them': {
      system: 'http://loinc.org',
      code: 'LA29520-6',
      display: 'they/them/their/theirs/themselves'
    }
  };
  let pronouns: Coding;

  let sexCharacteristicOptions = {
    '': undefined,
    'I have typical characteristics for my sex': {
      system: 'http://www.abs.gov.au/ausstats/XXXX',
      code: '2',
      display: 'No'
    },
    'I have variations from typical characteristics': {
      system: 'http://www.abs.gov.au/ausstats/XXXX',
      code: '1',
      display: 'Yes'
    },
    'Not sure': {
      system: 'http://www.abs.gov.au/ausstats/XXXX',
      code: '3',
      display: "Don't know"
    }
  };
  let sexCharacteristics: Coding;

  let culture = '';
  let community = '';


  let religionOptions = {
    '': undefined,
    'Not Important': undefined,
    'Buddhist': {
      code: 'BUD',
      display: 'Buddhist',
      system: "http://terminology.hl7.org/CodeSystem/v2-0006"
    },
    'Catholic': {
      code: 'C',
      display: 'Catholic',
      system: "http://terminology.hl7.org/CodeSystem/v2-0006"
    },
    'Christian': {
      code: 'CHR',
      display: 'Christian',
      system: "http://terminology.hl7.org/CodeSystem/v2-0006"
    },
    'Hindu': {
      code: 'HIN',
      display: 'Hindu',
      system: "http://terminology.hl7.org/CodeSystem/v2-0006"
    },
    'Jewish': {
      code: 'JEW',
      display: 'Jewish',
      system: "http://terminology.hl7.org/CodeSystem/v2-0006"
    },
    'Muslim': {
      code: 'MOS',
      display: 'Muslim',
      system: "http://terminology.hl7.org/CodeSystem/v2-0006"
    },
    'Other': {
      code: 'OTH',
      display: 'Other',
      system: "http://terminology.hl7.org/CodeSystem/v2-0006"
    }
  };
  let religion: Coding;

  let preferredLanguage = '';
  let spokenLanguages = '';
  
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  function prepareIps() {
    let languages = spokenLanguages?.trim().split(/,?\s+/).filter((l) => l.toLowerCase() !== preferredLanguage.toLowerCase());
    const patient = constructPatientResource({
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
      preferredLanguage,
      languages
    });
    patient.id = "customPatient";
    let result: ResourceRetrieveEvent = {
      resources: [ patient ],
      category: CATEGORY,
      method: METHOD,
      source: SOURCE.url,
      sourceName: SOURCE.name
    };
    resourceDispatch('update-resources', result);
  }
  
</script>

<!-- <p class="text-secondary"><em>Add or update the personal information that will be shown in this Health Summary.</em></p> -->
<form on:submit|preventDefault={() => FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, SOURCE.name, prepareIps)}>
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
          {#each Object.entries(pronounOptions) as [option, value]}
            <option value={value} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              {option}
            </option>
          {/each}
        </Input>
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Sex Characteristics">
        <Input type="select" bind:value={sexCharacteristics} style="width: 165px">
          {#each Object.entries(sexCharacteristicOptions) as [option, value]}
            <option value={value} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
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
  <FormGroup style="font-size:small" class="text-secondary">
    <Row>
      <Col xs="auto">
        <Input type="select" bind:value={religion} style="width: 250px">
          {#each Object.entries(religionOptions) as [option, value]}
            <option value={value} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              {option}
            </option>
          {/each}
        </Input>
        <Label>Religion</Label>
      </Col>
      <Col xs="auto">
        <ReligionCodeInput bind:value={religion} />
      </Col>
    </Row>
  </FormGroup>
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
<FHIRDataServiceChecker bind:this={FHIRDataServiceCheckerInstance}/>
<span class="text-danger">{fetchError}</span>
