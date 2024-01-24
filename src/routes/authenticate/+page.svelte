<script lang="ts">
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { getContext } from 'svelte';
    import type { Writable } from 'svelte/store';
    import type { SHLAdminParams, SHLClient } from '$lib/managementClient';
    import type { SHLSubmitEvent, SHCFile } from '$lib/types';
    import AddFileLTT from '$lib/AddFileLTT.svelte';
  
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
  
    async function addFiles(shl:SHLAdminParams, fileList:SHCFile[]) {
      for (let i=0; i < fileList.length; i++) {
        shl = await shlClient.addFile(shl, fileList[i], 'application/smart-health-card');
      }
      return shl;
    }
  
    async function newShlFromShc(details: SHLSubmitEvent): Promise<SHLAdminParams> {
      let shlCreated = await shlClient.createShl({exp: details.exp, passcode: details.passcode });
      shlCreated = await addFiles(shlCreated, details.shcs);
      shlCreated.label = details.label;
      shlCreated.passcode = details.passcode;
      return shlCreated;
    }
  
  </script>
  
  {#if shl}
  <h2>Add Record to "{shl.label}"</h2>
  {/if}
  
  <AddFileLTT
    on:shl-submitted={async ({ detail }) => {
      if (shl) {
        shl = await addFiles(shl, detail.shcs);
        $shlStore[$shlStore.findIndex(obj => obj.id === shl?.id)] = shl;
        goto(`/view/${shl.id}`);
      } else {
        const newShl = await newShlFromShc(detail);
        $shlStore = [...$shlStore, newShl];
        goto(`/view/${newShl.id}`);
      }
    }}
  />
  