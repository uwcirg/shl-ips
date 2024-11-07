<script lang="ts">
  import type { Procedure } from "fhir/r4";
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  
  export let resource: Procedure; // Define a prop to pass the data to the component
</script>

<CodeableConcept codeableConcept={resource.code} />
{#if resource.performedDateTime}
  Performed {resource.performedDateTime.split("T")[0]}
{:else if resource.performedPeriod}
  Performed {resource.performedPeriod}
{:else if resource.performedString}
  Performed {resource.performedString}
{:else if resource.performedAge}
  Performed age {resource.performedAge}
{:else if resource.performedRange}
  Performed age {resource.performedRange}
{/if}
