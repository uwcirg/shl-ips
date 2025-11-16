<script lang="ts">
  import {
    Button,
    Modal,
    ModalBody,
    ModalHeader,
    ModalFooter,
    Icon
  } from 'sveltestrap';
  import { FHIRDataService } from '$lib/utils/FHIRDataService';
  import { getContext } from 'svelte';
  
  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let callbackFn: Function = () => {};

  let open = false;
  const toggle = () => (open = !open);

  let category;
  let source;

  export async function checkFHIRDataServiceBeforeFetch(categoryCode: string, sourceUrl: string, fetchCallback: Function) {
    category = categoryCode;
    source = sourceUrl;
    if (!category || !source) {
      return;
    }
    callbackFn = fetchCallback;
    if (fhirDataService.datasetExists(category, source)) {
      toggle();
    } else {
      return await callbackFn();
    }
  }
</script>

<Modal isOpen={open} backdrop="static" {toggle}>
  <ModalHeader {toggle}>Overwrite existing data from this source?</ModalHeader>
  <ModalBody>
    This will overwrite the data you have already added from this source. Press "Cancel" if you would like to keep or review your data before continuing.
  </ModalBody>
  <ModalFooter>
    <Button color="danger" on:click={toggle}>Cancel</Button>
    <Button color="success"  on:click={() => {toggle(); callbackFn();} }><Icon name="check" /> Yes, overwrite data</Button>
  </ModalFooter>
</Modal>
