<script lang="ts">
    import {
        Button, 
        Col,
        FormGroup,
        Input,
        Label,
        Row,
        Spinner } from 'sveltestrap';
    import type { ResourceRetrieveEvent, SHCRetrieveEvent } from './types';
    import { getResourcesFromIPS } from './resourceUploaderTSWrapper';
    import { createEventDispatcher } from 'svelte';
    
    const resourceDispatch = createEventDispatcher<{'updateResources': ResourceRetrieveEvent}>();
    const shcDispatch = createEventDispatcher<{'updateSHC': SHCRetrieveEvent}>();

    let uploadFiles: FileList | undefined;
    let processing = false;
    let fetchError = "";
    export let resourceResult: ResourceRetrieveEvent = {
        resources: undefined
    };
    export let shcResult: SHCRetrieveEvent = {
        shc: undefined
    }
  
    async function prepareIps() {
        processing = true;
        fetchError = "";
        try {
            let content;
    
            if (uploadFiles?.[0] instanceof File) {
                content = JSON.parse(new TextDecoder().decode(await uploadFiles[0].arrayBuffer()));
            }
    
            if (content != undefined && content.verifiableCredential) {
                shcResult.shc = content;
                return shcDispatch('updateSHC', shcResult);
            }
    
            resourceResult.resources = getResourcesFromIPS(content);
            
            processing = false;
            return resourceDispatch('updateResources', resourceResult);
        } catch (e) {
            console.log('Failed', e);
            fetchError = "Error preparing IPS";
        }
    }
</script>

<form on:submit|preventDefault={() => prepareIps()}>
    <FormGroup>
        <Label>Upload Bundle (<code>.json</code> or signed <code>.smart-health-card</code>)</Label>
        <Input type="file" name="file" bind:files={uploadFiles} />
    </FormGroup>

    <Row>
        <Col xs="auto">
        <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
            {#if !processing}
            Add Data
            {:else}
            Adding...
            {/if}
        </Button>
        </Col>
        {#if processing}
        <Col xs="auto">
        <Spinner color="primary" type="border" size="md"/>
        </Col>
        {/if}
    </Row>
</form>

<span class="text-danger">{fetchError}</span>

  