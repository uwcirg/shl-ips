<script lang="ts">
  import { Icon, Spinner } from '@sveltestrap/sveltestrap';
  import { StateManager } from '$lib/utils/StateManager';

  export let status: StateManager;
  export let isLoading: boolean;
  export let size="sm";
  export let color="secondary";

  $: isLoading = $status?.state === StateManager.State.LOADING;
</script>

{#if $status?.state === StateManager.State.LOADING}
  <slot name="loader">
    <Spinner color={color} size={size} />
  </slot>
{:else if $status?.state === StateManager.State.ERROR}
  <slot name="error">
    <Icon name="exclamation-triangle" class="text-danger" size={size}/>
  </slot>
{:else}
  <slot name="content">
    <slot/>
  </slot>
{/if}