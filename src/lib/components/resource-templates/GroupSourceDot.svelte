<script lang="ts">
  import { NEUTRAL_SOURCE_COLOR, useGroupSources } from '$lib/components/resource-templates/groupSources';

  // A dot in the colour of the source a group member came from, with the source name as a tooltip.
  // Where the page has no source colours there is no dot; with `placeholder` an invisible dot of
  // the same size is left, so rows keep their alignment and indent.
  export let source: string | undefined = undefined;
  export let placeholder = false;
  let className = '';
  export { className as class };

  const { showSources, colorMap, sourceName, colorOf } = useGroupSources();
</script>

{#if showSources}
  <span
    class="group-source-dot {className}"
    style:background={colorOf(source, $colorMap) ?? NEUTRAL_SOURCE_COLOR}
    title={`From ${sourceName(source, $colorMap) ?? ''}`}
  ></span>
{:else if placeholder}
  <span class="group-source-dot {className}"></span>
{/if}

<style>
  .group-source-dot {
    display: inline-block;
    flex: 0 0 auto;
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
  }
</style>
