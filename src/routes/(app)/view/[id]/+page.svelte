<script lang="ts">
  import { page } from '$app/stores';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';
  import HealthLink from '$lib/components/app/HealthLink.svelte';
  import type { SHLAdminParams } from '$lib/utils/managementClient';
  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  let shl: SHLAdminParams | undefined;
  $: {
    shl = $shlStore.filter((s) => s.id === $page.params.id)?.[0];
  }
</script>

<svelte:head>
    <title>{shl?.label ?? "My Summary"} - WA Health Summary</title> 
</svelte:head>


{#if shl}
  <HealthLink {shl} />
{:else}
  Summary not found.
{/if}
