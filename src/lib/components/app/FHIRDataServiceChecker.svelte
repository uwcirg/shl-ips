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
  let userResources = fhirDataService.userResources;
  let callbackFn: Function = () => {};

  let open = false;
  const toggle = () => (open = !open);

  let category: string;
  let method: string;
  let source: string;

  let dataset = writable({} as { status: any, collection: any });

  export async function checkFHIRDataServiceBeforeFetch(categoryCode: string, methodCode: string, sourceUrl: string, fetchCallback: Function) {
    category = categoryCode;
    method = methodCode;
    source = sourceUrl;
    callbackFn = fetchCallback;
    if (fhirDataService.datasetExists(category, method, source)) {
      $dataset = $userResources[category][method][source];
      toggle();
    } else {
      return await callbackFn();
    }
  }
</script>

<Modal isOpen={open} backdrop="static" {toggle}>
  <ModalHeader {toggle}>Update existing information?</ModalHeader>
  <ModalBody>
    The existing information from this source will be replaced.
    <br />
    Press "Cancel" if you would like to keep or review your data before continuing.
    <Row class="mt-3">
      <Col>
        <DatasetView dataset={$dataset} masterPatient={fhirDataService.masterPatient} />
      </Col>
    </Row>
  </ModalBody>
  <ModalFooter>
  <Row class="w-100">
    <Col class="d-flex flex-grow-1">
      <Button color="secondary" outline on:click={toggle}>Cancel</Button>
    </Col>
    <Col class="d-flex flex-grow-1 justify-content-end">
      <Button color="success"  on:click={() => {toggle(); callbackFn();} }><Icon name="check" /> Yes, update data</Button>
    </Col>
  </Row>
  </ModalFooter>
</Modal>
