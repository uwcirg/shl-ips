<script lang="ts">
    import HealthLink from '$lib/HealthLink.svelte';
    import AddFile from '$lib/AddFile.svelte';
  
    let shlReady = false;

    function updateReady(ready: boolean) {
      shlReady = ready;
    }
  </script>
  
  <AddFile
    on:shl-ready={ ({ detail }) => { updateReady(detail) } }
  />

  {#if shlReady}
    <HealthLink/>
  {/if}
