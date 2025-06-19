<script lang="ts">
    import {
        Button, 
        Col,
        FormGroup,
        Input,
        Label,
        Row,
        Spinner } from 'sveltestrap';
    import type { ResourceRetrieveEvent } from '$lib/utils/types';
    import { createEventDispatcher } from 'svelte';
    
    const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

    let uploadFiles: FileList | undefined;
    let processing = false;
    let fetchError = "";

    let resourceResult: ResourceRetrieveEvent = {
        resource: undefined
    };
  
    async function retrieveDocument() {
        processing = true;
        fetchError = "";
        try {
            let content;
            let filename;
    
            if (uploadFiles?.[0] instanceof File) {
                filename = uploadFiles[0].name;
                content = await uploadFiles[0].arrayBuffer();
            }
            processing = false;
            resourceResult = {
                resources: content,
                source: filename
            };
            resourceDispatch('update-resources', resourceResult);
        } catch (e) {
            processing = false;
            console.log('Failed', e);
            fetchError = "Error adding file";
        }
    }
</script>

<form on:submit|preventDefault={() => retrieveDocument()}>
    <FormGroup>
        <Label>Add a POLST document to upload (<code>.pdf</code>)</Label>
        <Input type="file" name="file" bind:files={uploadFiles} />
    </FormGroup>

    <Row>
        <Col xs="auto">
        <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
            {#if !processing}
            Add File{(uploadFiles?.length ?? 0) > 1 ? `s` : ""}
            {:else}
            Adding...
            {/if}
        </Button>
        </Col>
        {#if processing}
        <Col xs="auto" class="d-flex align-items-center px-0">
            <Spinner color="primary" type="border" size="md"/>
        </Col>
        {/if}
    </Row>
</form>

<span class="text-danger">{fetchError}</span>

  