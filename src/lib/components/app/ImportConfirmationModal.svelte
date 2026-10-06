<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Button, Icon, Modal, ModalBody, ModalFooter, ModalHeader, Spinner } from '@sveltestrap/sveltestrap';
  import { ResourceCollection } from '$lib/utils/ResourceCollection';
  import type { PreparedImport } from '$lib/utils/FHIRDataService';
  import FHIRResourceList from '$lib/components/app/FHIRResourceList.svelte';

  export let prepared: PreparedImport | undefined = undefined;
  export let processing: boolean = false;

  const dispatch = createEventDispatcher<{ confirm: PreparedImport, cancel: void }>();

  // Display a copy so the collection's patient-reference updates don't alter the prepared resources
  let collection: ResourceCollection | undefined;
  $: collection = prepared ? new ResourceCollection(structuredClone(prepared.resources)) : undefined;

  function cancel() {
    if (!processing) {
      dispatch('cancel');
    }
  }
</script>

<Modal isOpen={Boolean(prepared)} backdrop="static" size="lg" scrollable toggle={cancel}>
  <ModalHeader toggle={cancel}>Confirm Import</ModalHeader>
  <ModalBody>
    {#if prepared && collection}
      <p>
        Review the data to be imported from {prepared.dataset.sourceName}.
        Any existing data from this source will be replaced.
      </p>
      {#key prepared}
        <FHIRResourceList resourceCollection={collection} scroll={false} />
      {/key}
    {/if}
  </ModalBody>
  <ModalFooter>
    <Button color="secondary" disabled={processing} on:click={cancel}>Cancel</Button>
    <Button
      color="primary"
      disabled={processing}
      on:click={() => prepared && dispatch('confirm', prepared)}
    >
      {#if processing}<Spinner size="sm" />{:else}<Icon name="check-lg" />{/if} Import
    </Button>
  </ModalFooter>
</Modal>
