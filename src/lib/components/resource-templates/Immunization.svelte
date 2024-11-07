<script lang="ts">
  import type { Immunization } from 'fhir/r4';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';

  export let resource: Immunization; // Define a prop to pass the data to the component
</script>
<CodeableConcept codeableConcept={resource.vaccineCode} />

{#if resource.occurrenceDateTime}
  Date: {resource.occurrenceDateTime.split("T")[0]}
{:else if resource.occurrenceString}
  Date: {resource.occurrenceString}
{/if}
