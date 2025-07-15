<script lang="ts">
  import { getContext } from 'svelte';
  import { Button, Col, Icon, Row } from 'sveltestrap';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams, SHLClient } from '$lib/utils/managementClient';

  let shlClient: SHLClient = getContext('shlClient');

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');

  let title: string = 'QR Code Summaries created and shared by me';
</script>

<p>Start creating a new sharable summary by clicking the button below.</p>

<h4 style="padding-bottom: 5px; border-bottom: 1px solid rgb(204, 204, 204); margin-bottom: 10px;">
  Create a new shareable health summary
</h4>
<Row>
  <Col md="1"></Col>
  <Col md="10">
    <Button color="success" style="width:100%" href={'/create'}>
      <b><Icon name="plus-lg" /></b> New Sharable Health Summary
    </Button>
  </Col>
  <Col md="1"></Col>
</Row>
<br>
{#if $shlStore.length > 0}
  <Row>
    <Col>
      <h4
        style="padding-left: 0; padding-bottom: 5px; border-bottom: 1px solid rgb(204, 204, 204); margin-bottom: 0px;"
      >
        {title}
      </h4>
    </Col>
  </Row>
  {#each $shlStore as shl, i}
    <Row style="display:flex; align-items:center; padding: 10px;">
      <Col>
        {shl.label || `My Summary ${i + 1}`}
      </Col>
      <Col class="d-flex flex-grow-1">
        <Button color="primary" style="width:100%" href={'/view/' + shl.id}>View/Manage</Button>
      </Col>
      <Col class="d-flex" style="max-width:fit-content">
        <Button color="danger" on:click={async function () {
          let success = await shlClient.deleteShl(shl);
          if (success) {
            $shlStore = await shlClient.getUserShls();
          }
        }}><Icon name="trash3" /></Button>
      </Col>
    </Row>
  {/each}
{/if}
<br>
