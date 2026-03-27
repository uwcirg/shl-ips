<script lang="ts">
  import {
    Col,
    Row
  } from '@sveltestrap/sveltestrap';
  import { getContext, onMount } from 'svelte';
  import ManageData from '$lib/components/app/ManageData.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let patient = fhirDataService.patient;

  onMount(async () => {
    
  })
</script>


<svelte:head>
  <title>My Data - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

<h4>Manage Health Data</h4>
<p>
  View and manage your imported health data.
</p>
<ManageData />
