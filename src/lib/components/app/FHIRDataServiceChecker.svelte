<script lang="ts">
  import {
    Button,
    Col,
    Icon,
    Modal,
    ModalBody,
    ModalHeader,
    ModalFooter,
    Row
  } from '@sveltestrap/sveltestrap';
  import { get, writable } from 'svelte/store';
  import { FHIRDataService } from '$lib/utils/FHIRDataService';
  import DatasetView from '$lib/components/app/DatasetView.svelte';
  import { getContext } from 'svelte';
  
  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let callbackFn: Function = () => {};

  let open = false;
  const toggle = () => (open = !open);

  let category: string;
  let source: string;

  let dataset = writable({});

  export async function checkFHIRDataServiceBeforeFetch(categoryCode: string, sourceUrl: string, fetchCallback: Function) {
    category = categoryCode;
    source = sourceUrl;
    callbackFn = fetchCallback;
    if (fhirDataService.datasetExists(category, source)) {
      $dataset = get(fhirDataService.userResources)[category][source];
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
    <Row class="mt-3">
      <Col>
        <DatasetView dataset={$dataset} masterPatient={fhirDataService.masterPatient} />
      </Col>
    </Row>
  </ModalBody>
  <ModalFooter>
    <Button color="danger" on:click={toggle}>Cancel</Button>
    <Button color="success"  on:click={() => {toggle(); callbackFn();} }><Icon name="check" /> Yes, overwrite data</Button>
  </ModalFooter>
</Modal>
