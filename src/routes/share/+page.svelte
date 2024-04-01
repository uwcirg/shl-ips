<script lang="ts">
  import HealthLinkLTT from '$lib/HealthLinkLTT.svelte';
  import AddFileLTT from '$lib/AddFileLTT.svelte';

  let shlReady = false;

  function updateReady(ready: boolean) {
    shlReady = ready;
  }
</script>

<svelte:head>
  <title>Let's Talk Tech - Share</title> 
</svelte:head>

<AddFileLTT
  on:shl-ready={ ({ detail }) => { updateReady(detail) } }
/>

{#if shlReady}
  <HealthLinkLTT/>
{/if}
