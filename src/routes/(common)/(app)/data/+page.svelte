<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AddDataset from '$lib/components/app/AddDataset.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import type { FHIRDataService } from '$lib/utils/fhirDataService';

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let patient = fhirDataService.patient;

  onMount(async () => {
    
  })
</script>


<svelte:head>
  <title>Add Data - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

<AddDataset />
