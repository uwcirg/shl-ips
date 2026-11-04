<script lang="ts">
  import type { Device } from "fhir/r4";
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import StatusBadge from '$lib/components/resource-templates/StatusBadge.svelte';

  export let content: ResourceTemplateParams<Device>; // Define a prop to pass the data to the component

  let resource: Device;
  $: if (content) resource = content.resource;
</script>
<StatusBadge status={resource.status} br />
{#if resource.type}
  <CodeableConcept codeableConcept={resource.type} />
{/if}
