<script lang="ts">
  import {
    Button,
    Col,
    Row,
    Spinner
  } from '@sveltestrap/sveltestrap';
  import { getContext } from 'svelte';
  import DemographicForm from '$lib/components/form/DemographicForm.svelte';
  import FHIRDataService from '$lib/utils/FHIRDataService';

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let demographics = fhirDataService.demographics;

  let processing = false;
  async function saveDemographics() {
    processing = true;
    await fhirDataService.saveDemographicsToPatient();
    processing = false;
  }
</script>

<form on:submit|preventDefault={() => saveDemographics()}>
  <h5>Patient Details</h5>
  <Row class="mt-3">
    <Col>
       <DemographicForm { demographics } hide={['mrn']} />
    </Col>
  </Row>
  <Row>
    <Col xs="auto">
      <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
        {#if !processing}
          Save
        {:else}
          Saving...
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