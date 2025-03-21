<script lang="ts">
  import type { Consent } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from './CodeableConcept.svelte';

  export let content: ResourceTemplateParams<Consent>; // Define a prop to pass the data to the component

  let resource: Consent = content.resource;
</script>
{#if resource.category?.[0]}
  <CodeableConcept codeableConcept={resource.category?.[0]} /><br>
{/if}
{#if resource.text?.div}
  {@html resource.text.div}
  <br>
{/if}
{#if resource.provision?.code}
  <strong>Intent:</strong><br>
  <CodeableConcept codeableConcept={resource.provision?.code} />
{/if}
