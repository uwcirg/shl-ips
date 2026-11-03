<script lang="ts">
  import { Icon } from '@sveltestrap/sveltestrap';

  // A pill showing how many filters are selected in one group, which clears them when clicked.
  // Renders nothing when none are selected.
  export let count = 0;
  // What is being cleared, for assistive technology, e.g. "sources"
  export let label = 'filters';
</script>

{#if count > 0}
  <button
    type="button"
    class="count-badge badge rounded-pill d-inline-flex align-items-center gap-1"
    aria-label={`Clear ${count} selected ${label}`}
    title={`Clear selected ${label}`}
    on:click
  >
    {count}
    <Icon name="x-lg" />
  </button>
{/if}

<style>
  /* White with a danger outline and text, matching the red "Clear all" button */
  .count-badge {
    border: 1px solid var(--bs-danger);
    background-color: var(--bs-body-bg, #fff);
    color: var(--bs-danger);
    cursor: pointer;
  }
  .count-badge:hover {
    background-color: var(--bs-danger-bg-subtle, #f8d7da);
  }
</style>
