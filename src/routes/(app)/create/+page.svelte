<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams, SHLClient } from '$lib/utils/managementClient';
  import type { SHLSubmitEvent, SHCFile } from '$lib/utils/types';
  import AddFile from '$lib/components/app/AddFile.svelte';

  let shlClient: SHLClient = getContext('shlClient');
  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');

  let shl: SHLAdminParams | undefined;
  let shlStatus = "";
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
    shlStatus = "Creating SHL";
    let shlCreated = await shlClient.createShl({exp: details.exp, passcode: details.passcode, label: details.label, source: details.source});
    $shlStore = await shlClient.getUserShls();
    let fullShlCreated = $shlStore.filter((s) => s.id === shlCreated.id)[0];
    shlStatus = "Adding IPS";
    shlCreated = await addFiles(fullShlCreated, details.shcs);
    return shlCreated;
  }

</script>

{#if shl}
<h4>Add another summary to "{shl.label}"</h4>
<br>
{/if}

<svelte:head>
    <title>Create a Summary - WA Health Summary</title> 
</svelte:head>

<AddFile
  status={shlStatus}
  on:shl-submitted={async ({ detail }) => {
    patientName = detail.patientName ?? "";
    if (shl) {
      shl = await addFiles(shl, detail.shcs);
      $shlStore = await shlClient.getUserShls();
      goto(`/view/${shl.id}`);
    } else {
      const newShl = await newShlFromShc(detail);
      $shlStore = await shlClient.getUserShls();
      goto(`/view/${newShl.id}`);
    }
  }}
/>
