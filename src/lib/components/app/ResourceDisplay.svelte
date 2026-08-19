<script lang="ts">
  import type { BundleEntry, Resource } from 'fhir/r4';
  import type { ResourceRenderInfo } from '$lib/stores/categorizedResources';
  import GenericResource from '$lib/components/resource-templates/GenericResource.svelte';

  export let renderInfo = { mode: 'component' } as ResourceRenderInfo;
  export let resource: Resource;
  export let entries: BundleEntry[]  = [];

</script>

{#if renderInfo.mode === 'component' && renderInfo.component}
  <svelte:component
    this={renderInfo.component}
    content={{ resource, entries }}
  />
{:else if renderInfo.mode === 'text' && resource.text?.div}
  {@html resource.text.div}
{:else}
  <GenericResource content={{ resource, entries }} />
{/if}