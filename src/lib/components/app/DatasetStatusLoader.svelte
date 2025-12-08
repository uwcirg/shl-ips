<script lang="ts">
  import { Icon, Spinner } from 'sveltestrap';
  import { StateManager } from '$lib/utils/StateManager';

  export let status: StateManager;
  export let isLoading: boolean;
  export let size="sm";
  export let color="secondary";

  $: isLoading = $status?.state === StateManager.State.LOADING;
</script>

{#if $status?.state === StateManager.State.LOADING}
  {#if $$slots.loader}
    <slot name="loader" />
  {:else}
    <Spinner color={color} size={size} />
  {/if}
{:else if $status?.state === StateManager.State.ERROR}
  {#if $$slots.error}
    <slot name="error" />
  {:else}
    <Icon name="exclamation-triangle" color="danger" size={size}/>
  {/if}
{:else}
  {#if $$slots.content}
    <slot name="content" />
  {/if}
  <slot />
{/if}