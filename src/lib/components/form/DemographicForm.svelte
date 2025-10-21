<script lang="ts">
  import { Col, FormGroup, Label, Input, Row } from 'sveltestrap';
  import { onMount } from 'svelte';
  import GenderInput from '$lib/components/form/GenderInput.svelte';
  import StateInput from '$lib/components/form/StateInput.svelte';
  import CountryInput from '$lib/components/form/CountryInput.svelte';
  import ReligionCodeInput from '$lib/components/form/ReligionCodeInput.svelte';
  import type { UserDemographics } from '$lib/utils/types';

  type DemographicFieldNames = "first"|"last"|"dob"|"gender"|"genderIdentity"|"mrn"|"email"|"phone"|"address"|"culture";
  export let show: Array<DemographicFieldNames>;
  export let hide: Array<DemographicFieldNames>;

  export let demographics: UserDemographics;

  $: $demographics.pronouns = Object.values(pronounOptions).find((p) => p?.code === $demographics.pronouns?.code) ?? $demographics.pronouns;
  $: $demographics.religion = Object.values(religionOptions).find((p) => p?.code === $demographics.religion?.code) ?? $demographics.religion;
  $: $demographics.sexCharacteristics = Object.values(sexCharacteristicOptions).find((v) => v?.code === $demographics.sexCharacteristics?.code) ?? $demographics.sexCharacteristics;
  
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

  function showField(key: DemographicFieldNames): boolean {
    return (show === undefined || show.includes(key)) && !hide?.includes(key);
  }

</script>

{#if showField('first') || showField('last')}
  {#if showField('first')}
    <FormGroup style="font-size:small" class="text-secondary" label="First Name">
      <Input type="text" bind:value={$demographics.first} />
    </FormGroup>
  {/if}
  {#if showField('last')}
    <FormGroup style="font-size:small" class="text-secondary" label="Last Name">
      <Input type="text" bind:value={$demographics.last} />
    </FormGroup>
  {/if}
{/if}
{#if showField('dob')}
  <FormGroup style="font-size:small" class="text-secondary" label="Date of Birth">
    <Input type="date" bind:value={$demographics.dob} placeholder={$demographics.dob} style="width: 165px"/>
  </FormGroup>
{/if}
{#if showField('gender') && !showField('genderIdentity')}
  <FormGroup style="font-size:small" class="text-secondary" label="Gender">
    <GenderInput bind:value={$demographics.gender} />
  </FormGroup>
{/if}
{#if showField('mrn')}
  <FormGroup style="font-size:small" class="text-secondary" label="National Health Identifier / MRN">
    <Input type="text" bind:value={$demographics.mrn} style="width: 165px"/>
  </FormGroup>
{/if}
{#if showField('phone') || showField('email')}
  <h5>Contact Information</h5>
  {#if showField('email')}
  <FormGroup style="font-size:small" class="text-secondary" label="Email">
    <Input type="email" bind:value={$demographics.email} title="Enter an email address" style="width: 200px"/>
  </FormGroup>
  {/if}
  {#if showField('phone')}
  <FormGroup style="font-size:small" class="text-secondary" label="Phone">
    <Input type="tel"
      bind:value={$demographics.phone}
      pattern="\+?[\d\(\)\- ]+$"
      title= "Enter a 10-digit phone number"
      style="width: 165px"/>
  </FormGroup>
  {/if}
{/if}
{#if showField('address')}
  <h5>Address</h5>
  <FormGroup style="font-size:small" class="text-secondary" label="Address Line 1">
    <Input type="text" bind:value={$demographics.address1} />
  </FormGroup>
  <FormGroup style="font-size:small" class="text-secondary" label="Address Line 2">
    <Input type="text" bind:value={$demographics.address2} />
  </FormGroup>
  <FormGroup style="font-size:small" class="text-secondary" label="City">
    <Input type="text" bind:value={$demographics.city} />
  </FormGroup>
  <Row>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="State">
        <StateInput bind:value={$demographics.state} />
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Zip">
        <Input type="text" maxlength="5" pattern="\d*" title="Enter a 5-digit zip code" bind:value={$demographics.zip} style="width:90px"/>
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Country">
        <CountryInput bind:value={$demographics.country} />
      </FormGroup>
    </Col>
  </Row>
{/if}
{#if showField('genderIdentity')}
  <h5>Gender Identity</h5>
  <Row>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Gender">
        <GenderInput bind:value={$demographics.gender} />
      </FormGroup>
    </Col>
  </Row>
  <Row>
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Pronouns">
          <Input type="select" bind:value={$demographics.pronouns} style="width: 165px">
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
          <Input type="select" bind:value={$demographics.sexCharacteristics} style="width: 165px">
            {#each Object.entries(sexCharacteristicOptions) as [option, value]}
              <option value={value} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                {option}
              </option>
            {/each}
          </Input>
        </FormGroup>
      </Col>
    </Row>
{/if}
{#if showField('culture')}
  <h5>Culture and Language</h5>
  <Row>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Your Culture">
        <Input type="text" bind:value={$demographics.culture} style="width: 250px"/>
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Your Place (country/community)">
        <Input type="text" bind:value={$demographics.community} style="width: 250px"/>
      </FormGroup>
    </Col>
  </Row>
  <FormGroup style="font-size:small" class="text-secondary">
    <Row>
      <Col xs="auto">
        <Input type="select" bind:value={$demographics.religion} style="width: 250px">
          {#each Object.entries(religionOptions) as [option, value]}
            <option value={value} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              {option}
            </option>
          {/each}
        </Input>
        <Label>Religion</Label>
      </Col>
      <Col xs="auto">
        <ReligionCodeInput bind:value={$demographics.religion} />
      </Col>
    </Row>
  </FormGroup>
  <Row>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Preferred Language">
        <Input type="text" bind:value={$demographics.preferredLanguage} style="width: 250px"/>
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Additional Languages You Understand">
        <Input type="text" bind:value={$demographics.spokenLanguages} style="width: 250px"/>
      </FormGroup>
    </Col>
  </Row>
{/if}
