<script lang="ts">
  import {
    Col,
    Row
  } from 'sveltestrap';
  import { getContext, onMount } from 'svelte';
  import AddDataset from '$lib/components/app/AddDataset.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let patient = fhirDataService.patient;

  onMount(async () => {
    
  })
</script>


<svelte:head>
  <title>My Data - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

<div class="px-3">
  <Row>
    <h4> My Health Data</h4>
    <p>
      Select a data category to display health data that you have imported, add data to it, and make changes.
    </p>
  </Row>
  <Row>
    <Col>
      <AddDataset />
    </Col>
  </Row>
</div>