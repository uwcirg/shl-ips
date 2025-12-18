<script lang="ts">
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { Device } from "fhir/r4";
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';

  export let content: ResourceTemplateParams<Device>; // Define a prop to pass the data to the component

  let resource: Device;
  $: if (content) resource = content.resource;
</script>
{#if resource.status}
  <Badge color="primary">{resource.status}</Badge><br>
{/if}
{#if resource.type}
  <CodeableConcept codeableConcept={resource.type} />
{/if}
