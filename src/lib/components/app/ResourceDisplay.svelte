<script lang="ts">
  import type { BundleEntry, Resource } from 'fhir/r4';
  import type { ResourceRenderInfo } from '$lib/stores/categorizedResources';
  import GenericResource from '$lib/components/resource-templates/GenericResource.svelte';
  import DisplayOptions from '$lib/components/resource-templates/DisplayOptions.svelte';

  export let renderInfo = { mode: 'component' } as ResourceRenderInfo;
  export let resource: Resource;
  export let entries: BundleEntry[]  = [];
  // 'always' shows code badges, 'advanced' shows them only in advanced mode, 'never' hides them.
  // Left unset, an enclosing display's setting is inherited (see DisplayOptions).
  export let codeBadges: 'always' | 'never' | 'advanced' | undefined = undefined;
  // Explicit per-instance override; takes precedence over codeBadges when set.
  export let showCodes: boolean | undefined = undefined;
</script>

<DisplayOptions {codeBadges} {showCodes}>
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
</DisplayOptions>
