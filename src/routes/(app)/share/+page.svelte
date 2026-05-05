<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams, SHLClient } from '$lib/utils/managementClient';
  import type { SHLSubmitEvent, SHCFile } from '$lib/utils/types';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import AddFile from '$lib/components/app/AddFile.svelte';
  import type { ToastStore } from '$lib/stores/toast';

  let component = INSTANCE_CONFIG.pages.share.component ?? AddFile;

  let shlClient: SHLClient = getContext('shlClient');
  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');

  const toast: ToastStore = getContext('toast');

  let shl: SHLAdminParams | undefined;
  let shlStatus = "";
  let patientName = "";
  $: {
    let shlIdParam = $page.url.searchParams.get('shlid');
    if (shlIdParam) {
      shl = $shlStore.find((s) => s.id === shlIdParam);
      if (shl == null) {
        goto('/share');
      }
    }
  }

  async function addFiles(shl:SHLAdminParams, fileList:SHCFile[], patientName?: string, contentType?: string): Promise<SHLAdminParams> {
    for (let i=0; i < fileList.length; i++) {
      shl = await shlClient.addFile(shl, fileList[i], patientName, contentType);
    }
    return shl;
  }

  async function newShlFromShc(details: SHLSubmitEvent): Promise<SHLAdminParams> {
    shlStatus = "Creating SHL";
    let shlCreated = await shlClient.createShl({exp: details.exp, passcode: details.passcode, label: details.label });
    $shlStore = await shlClient.getUserShls();
    let fullShlCreated = $shlStore.filter((s) => s.id === shlCreated.id)[0];
    shlStatus = "Adding IPS";
    shlCreated = await addFiles(fullShlCreated, details.shcs, details.patientName, details.contentType);
    return shlCreated;
  }

</script>

<svelte:head>
    <title>Create a Health Link - {INSTANCE_CONFIG.title}</title>
</svelte:head>

{#if shl}
<h4>Add another summary to "{shl.label}"</h4>
<br>
{/if}

<svelte:component this={component}
  status={shlStatus}
  on:shl-submitted={async ({ detail }) => {
    patientName = detail.patientName ?? "";
    if (shl) {
      shl = await addFiles(shl, detail.shcs, patientName, detail.contentType);
      $shlStore = await shlClient.getUserShls();
      toast.add({
        message: `Added summary to ${shl.label}`,
        type: 'success'
      });
      goto(`/view/${shl.id}`);
    } else {
      const newShl = await newShlFromShc(detail);
      $shlStore = await shlClient.getUserShls();
      toast.add({
        message: `Saved ${newShl.label}`,
        type: 'success'
      });
      goto(`/view/${newShl.id}`);
    }
  }}
/>
