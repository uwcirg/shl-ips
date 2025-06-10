<script lang="ts">
  import { Col, FormGroup, Label, Input, Row } from 'sveltestrap';
  import { demographics as demographicStore } from '$lib/stores/demographics';
  import GenderInput from '$lib/components/form/GenderInput.svelte';
  import StateInput from '$lib/components/form/StateInput.svelte';
  import CountryInput from '$lib/components/form/CountryInput.svelte';
  import type { UserDemographics } from '$lib/utils/types';

  type DemographicFieldNames = "first"|"last"|"dob"|"gender"|"mrn"|"phone"|"address";
  export let show: Array<DemographicFieldNames>;
  export let hide: Array<DemographicFieldNames>;

  export let demographics: UserDemographics = $demographicStore;

  function showField(key: DemographicFieldNames): boolean {
    return (show === undefined || show.includes(key)) && !hide?.includes(key);
  }

</script>

{#if showField('first') || showField('last')}
  <Label>Name</Label>
  {#if showField('first')}
    <FormGroup style="font-size:small" class="text-secondary" label="First">
      <Input type="text" bind:value={$demographicStore.first} />
    </FormGroup>
  {/if}
  {#if showField('last')}
    <FormGroup style="font-size:small" class="text-secondary" label="Last">
      <Input type="text" bind:value={$demographicStore.last} />
    </FormGroup>
  {/if}
{/if}
{#if showField('dob') || showField('gender')}
  <Label>Demographics</Label>
  {#if showField('dob')}
    <FormGroup style="font-size:small" class="text-secondary" label="Date of Birth">
      <Input type="date" bind:value={$demographicStore.dob} placeholder={$demographicStore.dob} style="width: 165px"/>
    </FormGroup>
  {/if}
  {#if showField('gender')}
    <FormGroup style="font-size:small" class="text-secondary" label="Gender">
      <GenderInput bind:value={$demographicStore.gender} />
    </FormGroup>
  {/if}
{/if}
{#if showField('mrn')}
  <FormGroup>
    <Label>MRN</Label>
    <Input type="text" bind:value={$demographicStore.mrn} style="width: 165px"/>
  </FormGroup>
{/if}
{#if showField('phone') || showField('address')}
  <Label>Contact Information</Label>
  {#if showField('phone')}
  <FormGroup style="font-size:small" class="text-secondary" label="Phone">
    <Input type="tel" bind:value={$demographicStore.phone} style="width: 165px"/>
  </FormGroup>
  {/if}
  {#if showField('address')}
    <Label>Address</Label>
    <FormGroup style="font-size:small" class="text-secondary" label="Address Line 1">
      <Input type="text" bind:value={$demographicStore.address1} />
    </FormGroup>
    <FormGroup style="font-size:small" class="text-secondary" label="Address Line 2">
      <Input type="text" bind:value={$demographicStore.address2} />
    </FormGroup>
    <FormGroup style="font-size:small" class="text-secondary" label="City">
      <Input type="text" bind:value={$demographicStore.city} />
    </FormGroup>
    <Row>
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="State">
          <StateInput bind:value={$demographicStore.state} />
        </FormGroup>
      </Col>
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Zip">
          <Input type="text" bind:value={$demographicStore.zip} style="width:90px"/>
        </FormGroup>
      </Col>
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Country">
          <CountryInput bind:value={$demographicStore.country} />
        </FormGroup>
      </Col>
    </Row>
  {/if}
{/if}
