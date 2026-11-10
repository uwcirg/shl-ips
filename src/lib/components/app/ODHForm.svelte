<script lang="ts">
  import { Accordion, AccordionItem, Button, Col, FormGroup, Icon, Input, Row, Spinner } from '@sveltestrap/sveltestrap';
  import { createEventDispatcher } from 'svelte';
  import MonthInput from '$lib/components/form/MonthInput.svelte';
  import NIOAutoCoderInput from '$lib/components/form/NIOAutoCoderInput.svelte';
  import type { IResourceCollection, ResourceRetrieveEvent } from '$lib/utils/types';
  import { METHODS, CATEGORIES } from '$lib/config/tags';
  import { ResourceHelper } from '$lib/utils/ResourceHelper';
  import type { Observation } from 'fhir/r4';
  import {
    EMPLOYMENT_STATUSES,
    ODH_BLANK_ENTRIES,
    applyOdhResources,
    buildOdhResources,
    copyOf,
    defaultOdhFormValues
  } from 'odh-autocoder';

  export let formData: IResourceCollection | undefined;
  export let processing: boolean = false;

  let buttonText = 'Save work info';
  let processingText = 'Saving...';

  let resources;
  $: resources = formData?.resources;
  $: if ($resources) {
    initializeFieldsForFormData();
  } else {
    initializeDefaultFields();
  }

  const resourceDispatch = createEventDispatcher<{ 'update-resources': ResourceRetrieveEvent }>();
  const CATEGORY = CATEGORIES.OCCUPATIONAL_DATA_FOR_HEALTH;
  const METHOD = METHODS.OCCUPATIONAL_DATA_FOR_HEALTH_FORM;
  const SOURCE = {
    url: window.location.origin,
    name: 'My Work Info'
  };

  let statuses = EMPLOYMENT_STATUSES;

  // Form values
  let values = defaultOdhFormValues();

  function initializeFieldsForFormData() {
    if (!$resources) { return; }

    const resources = (Object.values($resources) as ResourceHelper[]).map(rh => rh.resource as Observation);
    if (!resources?.length) { return; }

    values = applyOdhResources(values, resources);
  }

  function initializeDefaultFields() {
    values = defaultOdhFormValues();
  }

  function addCurrentJob() {
    values.currentWork.push(copyOf(ODH_BLANK_ENTRIES.currentWork));
    values=values;
  }

  function addPastJob() {
    values.pastWork.push(copyOf(ODH_BLANK_ENTRIES.pastWork));
    values=values;
  }

  function addRetirementDate() {
    values.retirementDates.push(copyOf(ODH_BLANK_ENTRIES.retirementDate));
    values=values;
  }

  function addCombatPeriod() {
    values.combatPeriods.push(copyOf(ODH_BLANK_ENTRIES.combatPeriod));
    values=values;
  }

  function deleteCurrentJob(index: number) {
    values.currentWork.splice(index, 1);
    values=values;
  }
  
  function deletePastJob(index: number) {
    values.pastWork.splice(index, 1);
    values=values;
  }
  
  function deleteRetirementDate(index: number) {
    values.retirementDates.splice(index, 1);
    values=values;
  }
  
  function deleteCombatPeriod(index: number) {
    values.combatPeriods.splice(index, 1);
    values=values;
  }
  
  function resetWorkInfo() {
    if ($resources && Object.keys($resources).length > 0) {
      initializeFieldsForFormData();
    } else {
      initializeDefaultFields();
    }
  }

  $: {
    if (values.status) {
      values.isWorking = values.status === 'Employed';
    }
  }

  function updateOdhSection() {
    const resources = buildOdhResources(values);
    let result: ResourceRetrieveEvent = {
      resources,
      category: CATEGORY,
      method: METHOD,
      source: SOURCE.url,
      sourceName: SOURCE.name
    };
    resourceDispatch('update-resources', result);
  }
</script>

<Accordion stayOpen>
  <AccordionItem active class="odh-section" header="Current work">
    <Row class="mb-2 gy-2">
      <Col xs="auto" class="inline-form-group">
        <span class="inline-label">I am currently:</span>
        <div class="group-control status-control">
          <Input type="select" bind:value={values.status}>
            {#each Object.keys(statuses) as stat}
              <option
                value={stat}
                style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
              >
                {stat}
              </option>
            {/each}
          </Input>
        </div>
      </Col>
    </Row>
    {#if values.isWorking}
      {#each values.currentWork as jobValue, index}
        <FormGroup>
          <Row class="mb-2 gy-2">
            <Col xs="auto" class="inline-form-group grow">
              <span class="inline-label">I work as a(n):</span>
              <div class="group-control">
                <NIOAutoCoderInput bind:value={jobValue.occupation} mode="Occupation" id={`current-occupation-${index}`} />
              </div>
            </Col>
          </Row>
          <Row class="mb-2 gy-2">
            <Col xs="auto" class="inline-form-group grow">
              <span class="inline-label">My company's primary business activity is:</span>
              <div class="group-control">
                <NIOAutoCoderInput bind:value={jobValue.industry} mode="Industry" id={`current-industry-${index}`}/>
              </div>
            </Col>
          </Row>
          <Row class="mb-4 pb-4 border-bottom gy-2">
            <Col xs="auto" class="inline-form-group">
              <span class="inline-label">I started this job:</span>
              <MonthInput bind:value={jobValue.start} />
            </Col>
            <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
              <Button outline color="danger" on:click={() => deleteCurrentJob(index)}>Delete</Button>
            </Col>
          </Row>
        </FormGroup>
      {/each}
      <Row>
        <Col>
          <Button color="secondary" outline on:click={() => addCurrentJob()}><Icon name="plus"/> Add { values.currentWork.length > 0 ? "another" : "a"} current job</Button>
        </Col>
      </Row>
    {/if}
  </AccordionItem>
  <AccordionItem active class="odh-section" header="Past work">
    {#each values.pastWork as jobValue, index}
      <FormGroup>
        <Row class="mb-2 gy-2">
          <Col xs="auto" class="inline-form-group grow">
            <span class="inline-label">I used to work as a(n):</span>
            <div class="group-control">
              <NIOAutoCoderInput bind:value={jobValue.occupation} mode="Occupation" id={`past-occupation-${index}`}/>
            </div>
          </Col>
        </Row>
        <Row class="mb-2 gy-2">
          <Col xs="auto" class="inline-form-group grow">
            <span class="inline-label">My company's primary business activity was:</span>
            <div class="group-control">
              <NIOAutoCoderInput bind:value={jobValue.industry} mode="Industry" id={`past-industry-${index}`}/>
            </div>
          </Col>
        </Row>
        <Row class="mb-4 pb-4 border-bottom gy-2">
          <Col xs="auto" class="inline-form-group">
            <span class="inline-label">I started this job:</span>
            <MonthInput bind:value={jobValue.start} />
          </Col>
          <Col xs="auto" class="inline-form-group">
            <span class="inline-label">and stopped:</span>
            <MonthInput bind:value={jobValue.end} />
          </Col>
          <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
            <Button outline color="danger" on:click={() => deletePastJob(index)}>Delete</Button>
          </Col>
        </Row>
      </FormGroup>
    {/each}
    <Row>
      <Col>
        <Button color="secondary" outline on:click={() => addPastJob()}><Icon name="plus"/> Add { values.pastWork.length > 0 ? "another" : "a"} past job</Button>
      </Col>
    </Row>
  </AccordionItem>
  <AccordionItem active class="odh-section" header="Retirement date">
    {#each values.retirementDates as retirementDate, index}
      <FormGroup>
        <Row class="mb-4 pb-4 border-bottom gy-2">
          <Col xs="auto" class="inline-form-group">
            <span class="inline-label">I retired in:</span>
            <MonthInput bind:value={retirementDate.start} />
          </Col>
          <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
            <Button outline color="danger" on:click={() => deleteRetirementDate(index)}>Delete</Button>
          </Col>
        </Row>
      </FormGroup>
    {/each}
    <Row>
      <Col>
        <Button color="secondary" outline on:click={() => addRetirementDate()}><Icon name="plus"/> Add { values.retirementDates.length > 0 ? "another" : "a"} retirement date</Button>
      </Col>
    </Row>
  </AccordionItem>
  <AccordionItem active class="odh-section" header="Combat zone work/hazardous duty">
    {#each values.combatPeriods as combatPeriod, index}
      <FormGroup>
        <Row class="mb-2 gy-2">
          <Col xs="auto" class="inline-form-group">
            <span class="inline-label">I started working in a combat zone or other hazardous conditions:</span>
            <MonthInput bind:value={combatPeriod.start} />
          </Col>
        </Row>
        <Row class="mb-4 pb-4 border-bottom gy-2">
          <Col xs="auto" class="inline-form-group">
            <span class="inline-label">and stopped:</span>
            <MonthInput bind:value={combatPeriod.end} />
          </Col>
          <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
            <Button outline color="danger" on:click={() => deleteCombatPeriod(index)}>Delete</Button>
          </Col>
        </Row>
      </FormGroup>
    {/each}
    <Row>
      <Col>
        <Button color="secondary" outline on:click={() => addCombatPeriod()}>
          <Icon name="plus"/> Add { values.combatPeriods.length > 0 ? "another" : "a"} combat period
        </Button>
      </Col>
    </Row>
  </AccordionItem>
</Accordion>
<br>
<Row class="justify-content-between align-content-center">
  <Col xs="auto">
    <Button color="primary" on:click={() => updateOdhSection()} disabled={processing}>
      {processing ? processingText : buttonText}
    </Button>
  </Col>
  <Col class="d-flex justify-content-start align-items-center px-0 flex-grow-1">
    {#if processing}
    <Spinner color="primary" type="border" size="md"/>
    {/if}
  </Col>
  <Col class="d-flex justify-content-end align-items-start">
    <Button color="danger" outline on:click={() => resetWorkInfo()}>
      Clear changes
    </Button>
  </Col>
</Row>

<style>
  :global(.odh-section > .accordion-collapse.show) {
    overflow: visible !important;
  }
  /* A label and its input stay together; the input drops below the label (or the whole group
     below the previous one) rather than overflowing on narrow screens */
  :global(.col-auto.inline-form-group) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
  }
  /* Fields that fill the row (the autocoder inputs): the label stays level with the input itself
     rather than centering on the taller column (the autocoder has a "Using ..." caption below) */
  :global(.col-auto.inline-form-group.grow) {
    flex: 1 1 auto;
    align-items: flex-start;
  }
  .group-control {
    flex: 1 1 14rem;
    min-width: 0;
  }
  .status-control {
    flex: 0 1 auto;
    max-width: 300px;
  }
  :global(.grow) > .inline-label {
    display: flex;
    align-items: center;
    /* Height of a single-line form control */
    min-height: calc(1.5em + 0.75rem + 2px);
  }
  .inline-label {
    flex: 0 1 auto;
  }
</style>
