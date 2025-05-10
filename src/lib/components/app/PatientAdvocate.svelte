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
  import type { ResourceRetrieveEvent } from '$lib/utils/types';

  let processing = false;
  let fetchError = '';

  let first = '';
  let last = '';
  let phone = '';
  let email = '';
  let legalPowerOfAttorney = false;

  let resucitate = true;
  let organDonor = true;
  let bloodTransfusion = true;
  
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  function prepareIps() {
    const resources = constructPatientResource();
    resourceDispatch('update-resources', resources);
  }
</script>

<form on:submit|preventDefault={() => prepareIps()}>
  <h5>Care Planning</h5>
  <p class="text-secondary"><em>This section is under development.</em></p>
  <p class="text-secondary"><em>We intend to link to the content of a DPOA for Healthcare if one is present, and allow standalone entry of this information if not.</em></p>
  <p class="text-secondary"><em>An advance directive, such as a Provider Order for Life Sustaining Treatment (POLST), is only one type of advance care planning document, and we are working elsewhere in our IPS interface on a more general approach.</em></p>
  <Row>
    <Label>Care Advocate</Label>
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
      <FormGroup style="font-size:small" class="text-secondary" label="Phone">
        <Input type="tel" bind:value={phone} style="width: 165px"/>
      </FormGroup>
    </Col>
    <Col xs="auto">
      <FormGroup style="font-size:small" class="text-secondary" label="Email">
        <Input type="text" bind:value={email} style="width: 250px"/>
      </FormGroup>
    </Col>
  </Row>
  <FormGroup>
    <Input type="checkbox" bind:checked={legalPowerOfAttorney} label="This person has Legal Power of Attorney"/>
  </FormGroup>
  <FormGroup>
    <Label>Is there anyone we should avoid contacting, or speaking to, on your behalf - for example, due to an avoidance relationship / family issues?</Label>
    <Input type="textarea" bind:value={email} rows={4} placeholder="Enter one name and relationship per line"/>
  </FormGroup>
  <FormGroup>
    <Label>Check any of the following that apply:</Label>
    <Input type="radio" bind:group={resucitate} value={true} label="I consent to all treatments aimed at sustaining or prolonging my life"/>
    <Input type="radio" bind:group={resucitate} value={false} label="I REFUSE any treatments aimed at sustaining or prolonging my life (DNR)"/>
  </FormGroup>
  <FormGroup>
    <Input type="radio" bind:group={organDonor} value={true} label="I am willing to be an organ donor"/>
    <Input type="radio" bind:group={organDonor} value={false} label="I am NOT willing to be an organ donor"/>
  </FormGroup>
  <FormGroup>
    <Input type="radio" bind:group={bloodTransfusion} value={true} label="I consent to receive a blood transfusion"/>
    <Input type="radio" bind:group={bloodTransfusion} value={false} label="I DO NOT consent to a blood transfusion"/>
  </FormGroup>
  <Row>
    <Col xs="auto">
      <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
        {#if !processing}
          Update your care plan information
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
