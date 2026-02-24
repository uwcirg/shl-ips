<script lang="ts">
  import {
    Button,
    Col,
    FormGroup,
    Icon,
    Input,
    Row,
    Spinner
  } from '@sveltestrap/sveltestrap';
  import { createEventDispatcher } from 'svelte';
  import type { IResourceCollection, ResourceRetrieveEvent } from '$lib/utils/types';
  import type { CodeableConcept, Condition, MedicationStatement } from 'fhir/r4';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';
  import { METHODS, CATEGORIES } from '$lib/config/tags';

  export let disabled = false;
  export let formData: IResourceCollection | undefined;
  let resources;
  $: resources = formData?.resources;

  const CATEGORY = CATEGORIES.PATIENT_STORY;
  const METHOD = METHODS.PATIENT_MEDICAL_HISTORY_FORM;
  const SOURCE = {
    url: window.location.origin,
    name: 'My Medical History'
  };
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;

  let processing = false;
  let fetchError = '';

  interface HealthHistoryEntry {
    name: string;
    detail: string
  };

  let entries: Record<string, HealthHistoryEntry[]> = {
    problems: [
      {name: '', detail: ''}
    ],
    medications: [
      {name: '', detail: ''}
    ],
    history: [
      {name: '', detail: ''}
    ]
  };

  let issueSeverityOptions: Record<string, CodeableConcept|undefined> = {
    '': undefined,
    'Major life challenge': {
      "system": "http://snomed.info/sct",
      "code": "24484000",
      "display": "Severe"
    },
    'Troublesome': {
      "system": "http://snomed.info/sct",
      "code": "6736007",
      "display": "Moderate severity"
    },
    'Background, but managed': {
      "system": "http://snomed.info/sct",
      "code": "255604002",
      "display": "Mild"
    }
  };
  
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();
  let currentConditionTemplate: Condition = {
    resourceType: "Condition",
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: "active",
          display: "Active"
        }
      ]
    },
    subject: {
      reference: "Patient/pat1"
    },
    recordedDate: "",
    code: {
      text: ""
    },
    severity: {
      coding: [],
      text: ""
    }
  };

  let medicationTemplate: MedicationStatement = {
    resourceType: "MedicationStatement",
    status: "active",
    subject: {
      reference: "Patient/pat1"
    },
    effectiveDateTime: "",
    medicationCodeableConcept: {
      text: ""
    },
    dosage: [
      {
        text: ""
      }
    ]
  }

  let pastConditionTemplate: Condition = {
    resourceType: "Condition",
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: "inactive",
          display: "Inactive"
        }
      ]
    },
    subject: {
      reference: "Patient/pat1"
    },
    recordedDate: "",
    code: {
      text: ""
    },
    onsetString: ""
  }

  function prepareCurrentConditionResource(entry: HealthHistoryEntry) {
    if (entry.name === '' && entry.detail === '') return;
    let currentCondition = JSON.parse(JSON.stringify(currentConditionTemplate));
    currentCondition.code.text = entry.name;
    currentCondition.severity.coding.push(issueSeverityOptions[entry.detail]);
    currentCondition.severity.text = entry.detail;
    currentCondition.recordedDate = new Date().toISOString().slice(0, 10);;
    return currentCondition;
  }

  function prepareMedicationStatementResource(entry: HealthHistoryEntry) {
    if (entry.name === '' && entry.detail === '') return;
    let medication = JSON.parse(JSON.stringify(medicationTemplate));
    medication.medicationCodeableConcept.text = entry.name;
    medication.dosage[0].text = entry.detail;
    medication.effectiveDateTime = new Date().toISOString().slice(0, 10);;
    return medication;
  }
  
  function preparePastConditionResource(entry: HealthHistoryEntry) {
    if (entry.name === '' && entry.detail === '') return;
    let pastCondition = JSON.parse(JSON.stringify(pastConditionTemplate));
    pastCondition.code.text = entry.name;
    pastCondition.onsetString = entry.detail;
    pastCondition.recordedDate = new Date().toISOString().slice(0, 10);
    return pastCondition;
  }

  function prepareIps() {
    const currentConditions = entries.problems.map(prepareCurrentConditionResource).filter((entry) => entry !== undefined);
    const medications = entries.medications.map(prepareMedicationStatementResource).filter((entry) => entry !== undefined);
    const pastConditions = entries.history.map(preparePastConditionResource).filter((entry) => entry !== undefined);
    const resources = [...currentConditions, ...medications, ...pastConditions];
    let result:ResourceRetrieveEvent = {
      resources: resources,
      category: CATEGORY,
      method: METHOD,
      source: SOURCE.url,
      sourceName: SOURCE.name
    }
    resourceDispatch('update-resources', result);
  }

  function addEntry(type: string) {
    entries[type] = [...entries[type], {name: '', detail: ''}];
  }

  function removeEntry(type: string, i: number) {
    entries[type].splice(i, 1);
    entries[type] = entries[type];
    if (entries[type].length == 0) {
      addEntry(type);
    }
  }
</script>

<!-- <p class="text-secondary"><em>This section will show health issues found in your IPS, where they are from, and will let you remove existing health issues or add new issues that are important to you.</em></p> -->
<form on:submit|preventDefault={() => {}}>
  <h5>Ongoing Health Issues</h5>
  {#each entries.problems as problem, i}
    <Row class="mb-1" style="width: 100%">
      <Col>
        <FormGroup style="font-size:small" class="text-secondary" label="Health Issue">
          <Input type="text" bind:value={problem.name} style="width: 100%; min-width: 200px" />
        </FormGroup>
      </Col>
      <Col>
        <FormGroup style="font-size:small" class="text-secondary" label="Severity">
          <Input type="select" bind:value={problem.detail} style="width: 100%; min-width: 150px">
            {#each Object.keys(issueSeverityOptions) as option}
              <option style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                {option}
              </option>
            {/each}
          </Input>
        </FormGroup>
      </Col>
      <Col xs="auto" class="align-items-end">
        <Button color="danger" outline on:click={() => removeEntry('problems', i)}>
          {#if entries.problems.length > 1}
            Remove
          {:else}
            Clear
          {/if}
        </Button>
      </Col>
    </Row>
  {/each}
  <Row class="mb-4">
    <Col>
      <Button color="secondary" outline style="width:fit-content" on:click={() => addEntry('problems')}><Icon name="plus"></Icon>Add Health Issue</Button>
    </Col>
  </Row>
  <h5>Medications I'm Taking Currently</h5>
  {#each entries.medications as medication, i}
    <Row class="mb-1" style="width: 100%">
      <Col>
        <FormGroup style="font-size:small" class="text-secondary" label="Medication">
          <Input type="text" bind:value={medication.name} style="width: 100%; min-width: 200px" />
        </FormGroup>
      </Col>
      <Col>
        <FormGroup style="font-size:small" class="text-secondary" label="Dose and Time of Day">
          <Input type="text" bind:value={medication.detail} style="width: 100%; min-width: 150px" />
        </FormGroup>
      </Col>
      <Col xs="auto" class="align-items-end">
        <Button color="danger" outline on:click={() => removeEntry('medications', i)}>
          {#if entries.medications.length > 1}
            Remove
          {:else}
            Clear
          {/if}
        </Button>
      </Col>
    </Row>
  {/each}
  <Row class="mb-4">
    <Col>
      <Button color="secondary" outline style="width:fit-content" on:click={() => addEntry('medications')}><Icon name="plus"></Icon>Add Medication</Button>
    </Col>
  </Row>

  <h5>Past Events/Illnesses</h5>
  {#each entries.history as history, i}
    <Row class="mb-1" style="width: 100%">
      <Col>
        <FormGroup style="font-size:small" class="text-secondary" label="Event/Illness">
          <Input type="text" bind:value={history.name} style="width: 100%; min-width: 200px" />
        </FormGroup>
      </Col>
      <Col>
        <FormGroup style="font-size:small" class="text-secondary" label="When">
          <Input type="text" bind:value={history.detail} style="width: 100%; min-width: 150px" />
        </FormGroup>
      </Col>
      <Col xs="auto" class="align-items-end">
        <Button color="danger" outline on:click={() => removeEntry('history', i)}>
          {#if entries.history.length > 1}
            Remove
          {:else}
            Clear
          {/if}
        </Button>
      </Col>
    </Row>
  {/each}
  <Row class="mb-4">
    <Col>
      <Button color="secondary" outline style="width:fit-content" on:click={() => addEntry('history')}><Icon name="plus"></Icon>Add Past Event/Illness</Button>
    </Col>
  </Row>


  <Row>
    <Col xs="auto">
      <Button
        color="primary"
        style="width:fit-content"
        disabled={processing || disabled}
        on:click={FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, METHOD, SOURCE.url, prepareIps)}>
        {#if !processing}
          Update your conditions, medications and history
        {:else}
          Adding...
        {/if}
      </Button>
    </Col>
    {#if processing}
      <Col xs="auto" class="d-flex align-items-center px-0">
        <Spinner color="primary" type="border" size="md"/>
      </Col>
    {/if}
    {#if disabled}
      <Col xs="auto" class="d-flex align-items-center px-0">
        Please wait...
      </Col>
    {/if}
  </Row>
</form>
<FHIRDataServiceChecker bind:this={FHIRDataServiceCheckerInstance}/>
<span class="text-danger">{fetchError}</span>
