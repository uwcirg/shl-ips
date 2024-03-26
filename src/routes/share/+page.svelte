<script lang="ts">
    import HealthLinkLTT from '$lib/HealthLinkLTT.svelte';
    import AddFileLTT from '$lib/AddFileLTT.svelte';
  
    let shlReady = false;

    function updateReady(ready: boolean) {
      shlReady = ready;
    }
  </script>
  
  <AddFileLTT
    on:shl-ready={ ({ detail }) => { updateReady(detail) } }
  />

  {#if shlReady}
    <HealthLinkLTT/>
  {/if}
