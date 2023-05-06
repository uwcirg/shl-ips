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
    <Button color="primary" href={'/create'}><span style="font-size: medium"><b>+</b></span> New IPS SHLink</Button>
</Row>
<br>
<Row>
    <h2>Your Stored SHLinks</h2>
    {#if $shlStore.length > 0}
        {#each $shlStore as shl, i}
            <tr>
                <!-- <th scope="row">shl</th> -->
                <td><Button color="primary" href={'/view/' + shl.id}>{shl.label || `SHLink ${i + 1}`}</Button></td>
            </tr>
        {/each}
    {/if}
</Row>
