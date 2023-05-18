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
<Row>
    <Button color="success" href={'/create'}><span style="font-size: medium"><b>+</b></span> New IPS SHLink</Button>
</Row>
<br>
<Row>
    <h2 style="border-bottom: 1px solid rgb(204, 204, 204);">Your Stored SHLinks</h2>
</Row>
{#if $shlStore.length > 0}
<table style="width:100%">
    {#each $shlStore as shl, i}
        <tr>
            <td>{shl.label || `SHLink ${i + 1}`}</td>
            <td><Button color="primary" style="width:100%" href={'/view/' + shl.id}>View/Manage</Button></td>
        </tr>
    {/each}
</table>
{/if}

