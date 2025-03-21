<script lang="ts">
  import type { Procedure } from "fhir/r4";
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from './CodeableConcept.svelte';
  import Date from './Date.svelte';
  import { choiceDTFields, hasChoiceDTField } from '$lib/utils/util';
  
  export let content: ResourceTemplateParams<Procedure>; // Define a prop to pass the data to the component
  let resource: Procedure = content.resource;
</script>

{#if resource.code}
  <CodeableConcept codeableConcept={resource.code} />
{/if}
{#if hasChoiceDTField("performed", resource)}
  Performed: <Date fields={choiceDTFields("performed", resource)} />
{/if}
