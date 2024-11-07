<script lang="ts">
  import type { Encounter } from 'fhir/r4';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';

  export let resource: Encounter; // Define a prop to pass the data to the component
</script>

<CodeableConcept codeableConcept={resource.reasonCode?.[0]} />
{#if resource.period?.start}
Effective {resource.period.start}{resource.period.end
    ? ` - ${resource.period.end}`
    : ''}
{/if}
<br>
{#if resource.status}
  Status: {resource.status}
{/if}
