<script lang="ts">
  import type { Immunization } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';
  import { hasChoiceDTField, choiceDTFields } from '$lib/utils/util';
  
  export let content: ResourceTemplateParams<Immunization>; // Define a prop to pass the data to the component

  let resource: Immunization;
$: if (content) resource = content.resource;
</script>
{#if resource.vaccineCode}
  <CodeableConcept codeableConcept={resource.vaccineCode} />
{/if}

{#if hasChoiceDTField("occurrence", resource)}
  Date: <Date fields={choiceDTFields("occurrence", resource)} />
{/if}
