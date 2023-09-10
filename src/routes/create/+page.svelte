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
    let shlIdParam = $page.url.searchParams.get('shlid');
    if (shlIdParam) {
      shl = $shlStore.find((s) => s.id === shlIdParam);
      if (shl == null) {
        goto('/create');
      }
    }
  }

  async function newShlFromShc(details: SHCRetrieveEvent): Promise<SHLAdminParams> {
    let shlCreated = await shlClient.createShl({exp: details.exp});
    shlCreated = await shlClient.addFile(shlCreated, details.shc, 'application/smart-health-card');
    shlCreated.label = details.label;
    return shlCreated;
  }
</script>

{#if shl}
<h2>Add Record to "{shl.label}"</h2>
{/if}

<AddFile
  on:shc-retrieved={async ({ detail }) => {
    if (shl) {
      let updatedShl = await shlClient.addFile(shl, detail.shc, 'application/smart-health-card');
      if (updatedShl != null) {
        shl = updatedShl;
        $shlStore[$shlStore.findIndex(obj => obj.id === shl?.id)] = shl;
        goto(`/view/${shl.id}`);
      } else {
        throw Error('Unable to add file to shl ' + shl.id);
      }
    } else {
      const newShl = await newShlFromShc(detail);
      $shlStore = [...$shlStore, newShl];
      goto(`/view/${newShl.id}`);
    }
  }}
/>
