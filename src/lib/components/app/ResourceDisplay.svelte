<script lang="ts">
  import type { BundleEntry, Resource } from 'fhir/r4';
  import type { ResourceRenderInfo } from '$lib/stores/categorizedResources';
  import GenericResource from '$lib/components/resource-templates/GenericResource.svelte';
  import { getContext, setContext } from 'svelte';
  import { derived, readable, writable, type Readable } from 'svelte/store';
  import { DISPLAY_OPTIONS, type DisplayOptions } from '$lib/components/resource-templates/displayOptions';

  export let renderInfo = { mode: 'component' } as ResourceRenderInfo;
  export let resource: Resource;
  export let entries: BundleEntry[]  = [];
  // 'always' shows code badges, 'advanced' shows them only in advanced mode, 'never' hides them.
  export let codeBadges: 'always' | 'never' | 'advanced' = 'never';
  // Explicit per-instance override; takes precedence over codeBadges when set.
  export let showCodes: boolean | undefined = undefined;

  const mode: Readable<string> = getContext('mode') ?? readable('');
  const setting = writable({ codeBadges, showCodes });
  $: setting.set({ codeBadges, showCodes });

  const showCodeBadges = derived([setting, mode], ([$s, $mode]) =>
    $s.showCodes ?? ($s.codeBadges === 'always' || ($s.codeBadges === 'advanced' && $mode === 'advanced'))
  );
  setContext<DisplayOptions>(DISPLAY_OPTIONS, { showCodeBadges });

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