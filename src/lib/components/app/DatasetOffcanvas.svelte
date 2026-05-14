<script lang="ts">
  import { getContext } from 'svelte';
  import { writable, derived } from 'svelte/store';
  import { get } from 'svelte/store';
  import { Button, Col, Icon, Offcanvas, Spinner, Row } from '@sveltestrap/sveltestrap';
  import type { ResourceCollection } from '$lib/utils/ResourceCollection';
  import { METHOD_NAMES } from '$lib/config/config';
  import DatasetStatusLoader from '$lib/components/app/DatasetStatusLoader.svelte';
  import FHIRResourceList from '$lib/components/app/FHIRResourceList.svelte';
  import FHIRDataService from '$lib/utils/FHIRDataService';

  export let dataset: { status: any, collection: ResourceCollection };
  export let isOpen = false;

  const fhirDataService: FHIRDataService = getContext('fhirDataService');
  let userResources = fhirDataService.userResources;
  let loading = fhirDataService.loading;

  let name = '';
  let ocCategory = writable('');
  let ocMethod = writable('');
  let ocSource = writable('');
  let ocDataset: any = derived(
    [userResources], 
    ([$userResources]) => {
      if (!$userResources) {
        return;
      }
      let dataset = $userResources?.[$ocCategory]?.[$ocMethod]?.[$ocSource];
      return dataset;
    });
  let dateDisplay = derived([ocDataset], ([$ocDataset]) => {
    if (!$ocDataset) {
      return '';
    }
    let patientStore = $ocDataset.collection.patient;
    let patient = get(patientStore);
    let updated = patient.meta.lastUpdated;
    let date = new Date(updated);
    let dateFormatted = date.toLocaleString(undefined, {
      dateStyle: "medium",
    });
    let timeFormatted = date.toLocaleString(undefined, {
      timeStyle: "short",
    });
    console.log($ocDataset);
    return dateFormatted;
  });
  let dateStr = '';
  $: dateStr = $dateDisplay;

  $: if (dataset) {
    showDataset(dataset.collection);
  }
  
  function showDataset(collection: ResourceCollection) {
    let { category, method, source, sourceName } = collection.getTags();
    $ocCategory = category;
    $ocMethod = method;
    $ocSource = source;
    let methodName = METHOD_NAMES[method]?.name;
  
    let sourceString = sourceName ?? "Unknown source";
    let methodString = methodName ? ` (${methodName})` : "";
    name = `${sourceString}${methodString}`;
    isOpen = true;
  }
  function toggle() {
    isOpen = !isOpen;
  }
</script>
<Offcanvas
  {isOpen}
  {toggle}
  scroll
  header={name}
  placement="end"
  title={name}
  style="display: flex; overflow-y:hidden; height: 100dvh; max-width: calc(2 * var(--bs-offcanvas-width)); width: 80dvw; min-width: var(--bs-offcanvas-width);"
>
  <div class="
      d-flex
      justify-content-between
      align-items-center
      flex-nowrap
      w-100
      p-2
      bg-light
      rounded-top
      border-top
      border-start
      border-end"
    style="height: 50px"
  >
    <div class="flex-shrink-0">
      {#if $dateDisplay} <!-- Updates the date if it changes after the offcanvas renders -->
        <Icon name="calendar-check"/> {$dateDisplay}
      {/if}
    </div>
    <div class="ms-3 flex-shrink-0">
      <Button
        size="sm"
        color="secondary"
        outline
        on:click={() => {
          const accordionButtons = document.querySelectorAll(`div.resource-content > h2.accordion-header > button.accordion-button.collapsed`);
          for (const accordionButton of Array.from(accordionButtons)) {
            accordionButton.click();
          }
        }}
      >
        Open All
      </Button>
      <Button
        size="sm"
        color="secondary"
        outline
        on:click={() => {
          const accordionButtons = document.querySelectorAll(`div.resource-content > h2.accordion-header > button.accordion-button:not(.collapsed)`);
          for (const accordionButton of Array.from(accordionButtons)) {
            accordionButton.click();
          }
        }}
      >
        Collapse All
      </Button>
    </div>
  </div>
  <div class="d-flex w-100" style="height: calc(100% - 100px);">
    <Col class="d-flex pe-0 h-100 w-100" style="overflow: auto">
      {#if $ocDataset && isOpen} <!-- Page freezes without this check -->
        <DatasetStatusLoader status={$ocDataset.status} size="md">
          <div slot="loader" class="d-flex justify-content-center align-items-center w-100">
            <Spinner slot="loader" size="md" color="secondary" />
          </div>
          <FHIRResourceList
            resourceCollection={$ocDataset.collection}
            bind:submitting={$loading}
            scroll={false}
            on:status-update={ ({ detail }) => { /*updateStatus(detail)*/ } }
            on:error={ ({ detail }) => { /*showError(detail)*/ } }
          />
        </DatasetStatusLoader>
      {/if}
    </Col>
  </div>
  <Row class="d-flex pe-0" style="height: 50px">
    <Col class="d-flex justify-content-start align-items-end" style="padding-top: 1rem">
      <slot name="action-button-start" />
    </Col>
    <Col class="d-flex justify-content-end align-items-end" style="padding-top: 1rem">
      <slot name="action-button-end" />
    </Col>
  </Row>
</Offcanvas>