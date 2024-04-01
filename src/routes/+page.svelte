<script lang="ts">
  import { goto } from '$app/navigation';
  import type { SHLAdminParams, SHLClient } from '$lib/managementClient';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';

  let shlClient: SHLClient = getContext('shlClient');
  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  goto('/share');
</script>

<svelte:head>
  <title>Let's Talk Tech - Share</title> 
</svelte:head>