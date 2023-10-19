<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams, SHLClient } from '$lib/managementClient';
  import type { SHLSubmitEvent, SHCFile } from '$lib/types';
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

  function addFiles(shl:SHLAdminParams, fileList:SHCFile[]) {
    return Promise.all(fileList.map((shc:SHCFile) => {
      shlClient.addFile(shl, shc, 'application/smart-health-card');
    }))
  }

  async function newShlFromShc(details: SHLSubmitEvent): Promise<SHLAdminParams> {
    let shlCreated = await shlClient.createShl({exp: details.exp});
    return addFiles(shlCreated, details.shcs).then(success => {
      shlCreated.label = details.label;
      return shlCreated;
    });
  }




</script>

{#if shl}
<h2>Add Record to "{shl.label}"</h2>
{/if}

<AddFile
  on:shl-submitted={async ({ detail }) => {
    if (shl) {
      addFiles(shl, detail.shcs).then(success => {
        $shlStore[$shlStore.findIndex(obj => obj.id === shl?.id)] = shl;
        goto(`/view/${shl.id}`);
      });
    } else {
      const newShl = await newShlFromShc(detail);
      $shlStore = [...$shlStore, newShl];
      goto(`/view/${newShl.id}`);
    }
  }}
/>
