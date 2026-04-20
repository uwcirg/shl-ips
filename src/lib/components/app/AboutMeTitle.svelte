<script lang="ts">
    import { ResourceHelper } from '$lib/utils/ResourceHelper';
  import { getContext, onMount } from 'svelte';

  let fhirDataService: any = getContext('fhirDataService');
  let masterPatient: ResourceHelper;
  $: masterPatient = fhirDataService.masterPatient;
  let patientName = "";

  $: {
    if ($masterPatient?.resource?.name?.[0].given) {
      patientName = $masterPatient?.resource?.name?.[0]?.given[0];
    }
  }
</script>

About {patientName ? patientName : "Me"}