<script lang="ts">
  import { page } from '$app/stores';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';
  import HealthLink from '$lib/components/app/HealthLink.svelte';
  import type { SHLAdminParams } from '$lib/utils/managementClient';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  let shl: SHLAdminParams | undefined;
  $: {
    shl = $shlStore.filter((s) => s.id === $page.params.id)?.[0];
  }
</script>

<svelte:head>
    <title>My Health Link - {INSTANCE_CONFIG.title}</title>
    <link rel="preload" as="image" href={`${INSTANCE_CONFIG.imgPath}/qr-banner-top.png`} />
    <link rel="preload" as="image" href={`${INSTANCE_CONFIG.imgPath}/qr-banner-bottom.png`} />
</svelte:head>


{#if shl}
  <HealthLink {shl} />
{/if}
