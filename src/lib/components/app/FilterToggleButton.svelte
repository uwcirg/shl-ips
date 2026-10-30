<script lang="ts">
  import { Badge, Button, Icon } from '@sveltestrap/sveltestrap';

  let className = '';
  export { className as class };

  export let open = false;
  // Active filters other than the search text; shown in place of the funnel
  export let count = 0;
</script>

<Button
  color="primary"
  outline={!open}
  class={'flex-shrink-0 d-inline-flex align-items-center gap-1 shadow-sm ' + className}
  aria-expanded={open}
  style={open ? undefined : '--bs-btn-bg: var(--bs-body-bg);'}
  on:click
>
  {#if count > 0}
    <Badge color="danger" pill>{count}</Badge>
  {:else}
    <Icon name="funnel" />
  {/if}
  Filters
  <Icon name="chevron-down" class="filter-chevron" style={open ? 'transform: rotate(180deg);' : ''} />
</Button>

<style>
  :global(.filter-chevron) {
    transition: transform 0.2s;
  }
</style>
