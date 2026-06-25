<script lang="ts">
  import type { Encounter } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import Date from '$lib/components/resource-templates/Date.svelte';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import { choiceDTFields } from '$lib/utils/util';
  
  export let content: ResourceTemplateParams<Encounter>; // Define a prop to pass the data to the component

  let resource: Encounter;
  $: if (content) resource = content.resource;
</script>

{#if resource.period}
  Effective: <Date period fields={choiceDTFields("period", resource)} /><br>
{/if}
{#if resource.status}
  Status: {resource.status}<br>
{/if}
<CodeableConcept codeableConcept={resource.reasonCode} />
