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
    <title>{shl?.label ?? "My Link"} - WA Verify+</title> 
</svelte:head>


{#if shl}
  <HealthLink {shl} />
{:else}
  SHLink {$page.params.id} not found.
{/if}
