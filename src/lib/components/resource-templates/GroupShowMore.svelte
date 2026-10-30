<script lang="ts">
  // The "Show N more ..." / "Show fewer" link under a group's list. The parent decides what is
  // hidden (`hiddenCount`) and keeps `expanded`, normally with bind:expanded. The link is shown
  // while something is hidden, or while expanded so it can be collapsed again.
  //
  //   <GroupShowMore {hiddenCount} noun="more result" bind:expanded={showAll} />
  export let hiddenCount: number;
  // Singular noun phrase after the count; an "s" is added unless the count is 1
  export let noun: string;
  export let expanded = false;
  // Left margin, to line the link up with the rows above it
  export let indent = '0.25rem';
</script>

{#if hiddenCount > 0 || expanded}
  <button
    type="button"
    class="group-show-more"
    style:margin-left={indent}
    on:click={() => (expanded = !expanded)}
  >
    {expanded ? 'Show fewer' : `Show ${hiddenCount} ${noun}${hiddenCount === 1 ? '' : 's'}`}
  </button>
{/if}

<style>
  .group-show-more {
    align-self: flex-start;
    margin-top: 0.25rem;
    padding: 0;
    border: 0;
    background: none;
    font-size: 0.85rem;
    color: var(--bs-link-color, #0d6efd);
    cursor: pointer;
  }
  .group-show-more:hover {
    text-decoration: underline;
  }
</style>
