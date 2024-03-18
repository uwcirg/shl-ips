<script lang="ts">
    import {
        Button, 
        Col,
        FormGroup,
        Input,
        Label,
        Row,
        Spinner } from 'sveltestrap';
    import type { SHCRetrieveEvent, IPSRetrieveEvent } from './types';
    import { createEventDispatcher } from 'svelte';
    
    const shcDispatch = createEventDispatcher<{'shc-retrieved': SHCRetrieveEvent}>();
    const ipsDispatch = createEventDispatcher<{'ips-retrieved': IPSRetrieveEvent}>();

    let uploadFiles: FileList | undefined;
    let processing = false;
    let fetchError = "";

    let shcResult: SHCRetrieveEvent = {
        shc: undefined
    };
    let ipsResult: IPSRetrieveEvent = {
        ips: undefined
    };
  
    async function retrieveIps() {
        processing = true;
        fetchError = "";
        try {
            let content;
            let filename;
    
            if (uploadFiles?.[0] instanceof File) {
                filename = uploadFiles[0].name;
                content = JSON.parse(new TextDecoder().decode(await uploadFiles[0].arrayBuffer()));
            }
            processing = false;
            if (content != undefined && content.verifiableCredential) {
                shcResult = {
                    shc: content,
                    source: filename
                };
                
                return shcDispatch('shc-retrieved', shcResult);
            }
            ipsResult = {
                ips: content,
                source: filename
            };
            ipsDispatch('ips-retrieved', ipsResult);
        } catch (e) {
            processing = false;
            console.log('Failed', e);
            fetchError = "Error preparing IPS";
        }
    }
</script>

<form on:submit|preventDefault={() => retrieveIps()}>
    <FormGroup>
        <Label>Upload Bundle (<code>.json</code> or signed <code>.smart-health-card</code>)</Label>
        <Input type="file" name="file" bind:files={uploadFiles} />
    </FormGroup>

    <Row>
        <Col xs="auto">
        <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
            {#if !processing}
            Fetch Data
            {:else}
            Fetching...
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

  