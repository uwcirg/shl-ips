<script lang="ts">
  import HealthLink from '$lib/components/app/HealthLink.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
    import { onMount } from 'svelte';
  import type { PageData } from './$types';

  export let data: PageData;
  onMount(() => {
    console.log(data);
  })
</script>

<svelte:head>
    <title>My Health Link - {INSTANCE_CONFIG.title}</title>
    <link rel="preload" as="image" href={`${INSTANCE_CONFIG.imgPath}/qr-banner-top.png`} />
    <link rel="preload" as="image" href={`${INSTANCE_CONFIG.imgPath}/qr-banner-bottom.png`} />
</svelte:head>

{#if data.unauthenticated || !data.shl}
<!-- Render nothing or a spinner while auth recovery runs -->
  <div>Loading...</div>
{:else}
  <HealthLink shl={data.shl} />
{/if}
