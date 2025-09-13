<script lang="ts">
  import { 
    Button,
    Col,
    FormGroup,
    Input,
    Label,
    Row,
    Spinner } from 'sveltestrap';

  import type { InsurcardRetrieveEvent } from '$lib/utils/types';
  import { createEventDispatcher } from 'svelte';

  const insurcardDispatch = createEventDispatcher<{'insurcard-retrieved': InsurcardRetrieveEvent}>();

  let processing = false;
  let fetchError = "";

  let insurcardResult: InsurcardRetrieveEvent = {
    insurcard: undefined
  };

  let qrCodeData = "";

  async function prepareIps() {
    fetchError = "";
    processing = true;
    try {
      if (!qrCodeData.trim()) {
        throw new Error("Please enter a QR code SMART Health Link");
      }

      // TODO: Implement actual QR code processing logic
      console.log("QR code data:", qrCodeData);
      
      processing = false;
      fetchError = "QR code processing not yet implemented";
    } catch (e) {
      processing = false;
      console.log('Failed', e);
      fetchError = e instanceof Error ? e.message : "Error processing QR code data";
    }
  }
</script>

<form on:submit|preventDefault={() => prepareIps()}>
<FormGroup>
  <Label>Enter the QR code SMART Health Link, including 'shlink:/'</Label>
  <Input 
    type="text" 
    bind:value={qrCodeData} 
    placeholder="shlink://..."
  />
</FormGroup>

<Row>
  <Col xs="auto">
    <Button color="primary" style="width:fit-content" disabled={!qrCodeData.trim() || processing} type="submit">
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
