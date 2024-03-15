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
  let patientName = "";
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
      shl = await shlClient.addFile(shl, fileList[i], patientName);
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

<svelte:head>
    <title>Create IPS - WA Verify+</title> 
</svelte:head>

<AddFile
  on:shl-submitted={async ({ detail }) => {
    patientName = detail.patientName;
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
