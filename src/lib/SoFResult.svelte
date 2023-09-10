<script lang='ts'>
    import { retrieve } from './sofClientTSWrapper';
    import { prepareResources, uploadResources } from './resourceUploaderTSWrapper';
    import { onMount } from 'svelte';
    import { Button } from 'sveltestrap';

    let resources: Array<any> | undefined;
    let submitting = false;
    let reference: string;

    // This function will be executed when the component is mounted
    onMount(async function() {
        // Your code for DOM manipulation or other tasks
        console.log('Component is mounted, DOM is ready');
        resources = await retrieve();
        resources = prepareResources(resources);
        console.log(resources);
    });

    async function confirm() {
        reference = await uploadResources();
    }
</script>

<form on:submit|preventDefault={() => confirm()}>
    {#if reference}
    <p>{reference}</p>
    {/if}
    <Button color="primary" style="width:fit-content" disabled={submitting} type="submit">
        {#if !submitting}
        Fetch IPS
        {:else}
        Fetching...
        {/if}
    </Button>
</form>