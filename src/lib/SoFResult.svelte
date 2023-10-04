<script lang='ts'>
    import { retrieve } from './sofClientTSWrapper';
    import { getIPSResources, prepareResources, uploadResources } from './resourceUploaderTSWrapper';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Button } from 'sveltestrap';
    import { page } from '$app/stores';
    let typeParam = $page.url.searchParams.get('type');

    let resources: Array<any> | undefined;
    let submitting = false;
    let reference: string;

    // This function will be executed when the component is mounted
    onMount(async function() {
        // Your code for DOM manipulation or other tasks
        console.log('Component is mounted, DOM is ready');
        let newResources = await getResourcesFromType();
        if (newResources) {
            resources = prepareResources(newResources);
        }
        console.log(resources);
    });

    async function confirm() {
        reference = await uploadResources();
        goto("/create");
    }

    async function getResourcesFromType() {
        if (typeParam == 'url') {
            let url = $page.url.searchParams.get('url');
            return fetch(url!, {
                    headers: { accept: 'application/fhir+json' }
                }).then(function(response) {
                    if (!response.ok) {
                        // make the promise be rejected if we didn't get a 2xx response
                        throw new Error("Unable to fetch IPS", {cause: response});
                    } else {
                        return response.json();
                    }
                }).then((body) => {
                    return getIPSResources(body);
                });
        } else if ($page.url.searchParams.get('code')) {
            return retrieve();
        }
    }
</script>

<Button color="secondary" style="width:fit-content" on:click={ () => {goto('/create')} }>Add More</Button><br/>
<form on:submit|preventDefault={() => confirm()}>
    {#if resources != null}
        {#each resources as resource}
            <p>{JSON.stringify(resource)}</p>
        {/each}
    {/if}
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