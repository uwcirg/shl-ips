<script lang="ts">
    import { getContext } from 'svelte';
    import { onMount } from 'svelte';
    import { Alert } from 'sveltestrap';
    import type { SOFClient } from '$lib/sofClient';
    import { goto } from '$app/navigation';

    let sofClient: SOFClient = getContext('sofClient');
    let errorMsg = "";

    onMount(() => {
        try {
            sofClient.logout();
        } catch (e) {
            console.error(e);
            errorMsg = "Unable to log out. Please try again later.";
            goto('/share');
        }
    });
</script>

<svelte:head>
  <title>Let's Talk Tech - Logout</title> 
</svelte:head>

{#if errorMsg}
<Alert color="danger">
    {errorMsg}
</Alert>
{/if}
