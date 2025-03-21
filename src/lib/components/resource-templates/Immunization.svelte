<script lang="ts">
  import type { Immunization } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from './CodeableConcept.svelte';
  import Date from './Date.svelte';
  import { hasChoiceDTField, choiceDTFields } from '$lib/utils/util';
  
  export let content: ResourceTemplateParams<Immunization>; // Define a prop to pass the data to the component

  let resource: Immunization = content.resource;
</script>
{#if resource.vaccineCode}
  <CodeableConcept codeableConcept={resource.vaccineCode} /><br>
{/if}

{#if hasChoiceDTField("occurrence", resource)}
  Date: <Date fields={choiceDTFields("occurrence", resource)} />
{/if}
