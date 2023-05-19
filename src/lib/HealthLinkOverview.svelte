<script lang="ts">
    import { getContext } from 'svelte';
    import {
        Button,
        Card,
        CardBody,
        CardFooter,
        CardHeader,
        CardSubtitle,
        CardText,
        CardTitle,
        Col,
        FormGroup,
        Icon,
        Input,
        Label,
        Row,
        Styles,

        Table

    } from 'sveltestrap';

    import { goto } from '$app/navigation';
    import type { Writable } from 'svelte/store';
    import type { SHLAdminParams, SHLClient } from './managementClient';

    let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
	if ($shlStore.length) {
	  
	} else {
	  
	}
</script>
<Styles />
{#if $shlStore.length > 0}
<Row>
    <h2 style="margin-bottom: 0px; border-bottom: 1px solid rgb(204, 204, 204);">Your Stored SHLinks</h2>
</Row>
{#each $shlStore as shl, i}
<Row style="display:flex; align-items:center; padding: 10px; border-bottom: 1px solid rgb(204, 204, 204);">
    <Col>{shl.label || `SHLink ${i + 1}`}</Col>
    <Col><Button color="primary" style="width:100%" href={'/view/' + shl.id}>View/Manage</Button></Col>
</Row>
{/each}
<table style="width:100%">
    
</table>
{/if}
<br>
<Row>
    <Col md="1"></Col>
    <Col md="10">
        <Button color="success" style="width:100%" href={'/create'}><span style="font-size: medium"><b>+</b></span> New IPS SHLink</Button>
    </Col>
    <Col md="1"></Col>
</Row>
<br>

