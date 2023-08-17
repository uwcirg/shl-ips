<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams, SHLClient } from '$lib/managementClient';
  import type { SHCRetrieveEvent } from '$lib/types';
  import AddFile from '$lib/AddFile.svelte';

  let shlClient: SHLClient = getContext('shlClient');
  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  let shl: SHLAdminParams | undefined;
  $: {
    shl = $shlStore.filter((s) => s.id === $page.params.id)?.[0];
  }

  async function newShlFromShc(details: SHCRetrieveEvent): Promise<SHLAdminParams> {
    const shlCreated = await shlClient.createShl({exp: details.exp});
    shlClient.addFile(shlCreated, details.shc, 'application/smart-health-card');
    shlCreated.label = details.label;
    return shlCreated;
  }
</script>

<AddFile
  on:shc-retrieved={async ({ detail }) => {
    if (shl == null) {
      goto('/create');
    } else {
      shlClient.addFile(shl, detail.shc, 'application/smart-health-card');
      goto(`/view/${shl.id}`);
    }
  }}
/>
