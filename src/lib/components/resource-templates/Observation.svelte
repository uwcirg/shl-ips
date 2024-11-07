<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { Observation } from "fhir/r4";
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import OccupationalData from '$lib/components/resource-templates/OccupationalData.svelte';
  
  export let resource: Observation; // Define a prop to pass the data to the component

  let OccupationalDataForHealthCodes = [
    "74165-2", // Employment Status
    "87510-4", // Retirement Date
    "87511-2", // Combat Zone Period
    "11341-5", // Job History
    // "21843-8", // Usual Work // TODO: Not implemented yet
  ];
</script>

{#if OccupationalDataForHealthCodes.includes(resource.code.coding?.[0].code ?? "")}
  <!-- Use Occupational Data templates -->
  <OccupationalData resource={resource} />
{:else}
  <!-- Generic Observation template -->
  {#if resource.category?.[0].coding}
    <Badge color="primary">{resource.category[0].coding[0].code}</Badge><br>
  {/if}
  <CodeableConcept codeableConcept={resource.code} />
  <CodeableConcept codeableConcept={resource.valueCodeableConcept} />
  {#if resource.valueQuantity}
    <strong>{resource.valueQuantity.value ?? ""} {resource.valueQuantity.unit ?? ""}</strong><br>
  {/if}
  {#if resource.valueString}
    <strong>{resource.valueString ?? ""}</strong><br>
  {/if}
  {#if !(resource.valueCodeableConcept || resource.valueQuantity || resource.valueString)}
    <br>
  {/if}
  Date: {resource.effectiveDateTime ? `${resource.effectiveDateTime.split("T")[0]}` : ''}
{/if}
