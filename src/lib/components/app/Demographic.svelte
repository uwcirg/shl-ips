<script lang="ts">
  import { Row, Col, Button, Spinner } from 'sveltestrap';
  import { createEventDispatcher, getContext } from 'svelte';
  import type { ResourceRetrieveEvent } from '$lib/utils/types';
  import DemographicForm from '$lib/components/form/DemographicForm.svelte';
  import FHIRDataService from '$lib/utils/FHIRDataService';

  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  let fhirDataService: FHIRDataService = getContext('fhirDataService');

  let processing = false;
  
  async function saveDemographics() {
    processing = true;
    let patientRH = fhirDataService.saveDemographicsToPatient();
    let patient = patientRH.resource;
    resourceDispatch('update-resources', {
      resources: [patient],
      hostname: 'WA Health Summary'
    });
    
    processing = false;
  }
</script>

<form on:submit|preventDefault={() => saveDemographics()}>
  <p>Please review your demographic information below.</p>
  <Row class="mt-3">
    <Col>
       <DemographicForm />
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