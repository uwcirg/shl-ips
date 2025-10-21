<script lang="ts">
  import { getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { Button, Card, CardHeader, CardBody, Row, Col } from 'sveltestrap';
  import Patient from '$lib/components/resource-templates/Patient.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import FHIRDataService from '$lib/utils/FHIRDataService';

  let mode = getContext('mode');
  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let masterPatient = fhirDataService.masterPatient;
</script>


<svelte:head>
  <title>Patient Data - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

<h4>My Patient Data</h4>
<p>
  This is the patient data that you have added to WA Health Summary. It can be used to represent you in any Health Summary you create and share. Edit it by clicking the button below.
</p>
{#if $masterPatient}
<Card style="width: 100%; max-width: 100%" class="mb-2">
  <CardHeader>
    <Row>
      <Col class="d-flex justify-content-start align-items-center">
        <h6>Patient</h6>
      </Col>
    </Row>
  </CardHeader>
  <CardBody>
    <Row style="overflow:hidden">
      <Col class="resource-content justify-content-center align-items-center">
        <Patient content={ {resource: $masterPatient.resource} } />
      </Col>
    </Row>
  </CardBody>
</Card>
{/if}
<Button color="primary" style="width:fit-content" on:click={() => goto('/data')}>Update My Patient Data</Button>

