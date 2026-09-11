<script lang="ts">
  import type { BundleEntry, Resource } from 'fhir/r4';
  import type { ResourceRenderInfo } from '$lib/stores/categorizedResources';
  import type { AiProvenanceIndex } from '$lib/utils/aiProvenance';
  import GenericResource from '$lib/components/resource-templates/GenericResource.svelte';
  import AiProvenanceBadge from '$lib/components/app/AiProvenanceBadge.svelte';

  export let renderInfo = { mode: 'component' } as ResourceRenderInfo;
  export let resource: Resource;
  export let entries: BundleEntry[]  = [];
  /**
   * Index over every resource in scope, used to find the AI Provenance that
   * targets this one. Omit it and no AI provenance is surfaced.
   */
  export let aiIndex: AiProvenanceIndex | undefined = undefined;

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
<AiProvenanceBadge {resource} index={aiIndex} />
