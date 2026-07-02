<script lang="ts">
  import type { BundleEntry, Resource } from 'fhir/r4';
  import type { CategorizedResource, ResourceRenderInfo } from '$lib/stores/categorizedResources';

  export let resource: CategorizedResource;
  export let entries: BundleEntry[]  = [];

</script>

{#if resource.renderInfo.mode === 'component'}
  <svelte:component
    this={resource.renderInfo.component}
    content={{ resource: resource.rh.resource, entries }}
  />
{:else if resource.renderInfo.mode === 'text'}
  {@html resource.rh.resource.text.div}
{:else}
  {resource.rh.tempId}
{/if}