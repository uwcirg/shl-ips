<script lang="ts">
    import { goto } from '$app/navigation';
    import { getContext } from 'svelte';
    import type { Writable } from 'svelte/store';
    import type { SHLAdminParams, SHLClient } from '$lib/managementClient';
    import type { SHCRetrieveEvent } from '$lib/types';
    import SoFResult from '$lib/SoFResult.svelte';
  
    let shlClient: SHLClient = getContext('shlClient');
    let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');

    // $: {
    //     // if (!sessionStorage.getItem('SMART_KEY')) {
    //     //     goto('/create');
    //     // }
    // }
  </script>

  <SoFResult></SoFResult>