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
  import { ResourceHelper } from '$lib/utils/ResourceHelper';
  import { copyOf } from '$lib/utils/util';

  export let disabled = false;
  export let formData: IResourceCollection | undefined;
  let resources;
  $: resources = formData?.resources;
  $: if ($resources) {
    initializeFieldsForFormData();
  } else {
    initializeDefaultFields();
  }

  const CATEGORY = CATEGORIES.PATIENT_STORY;
  const METHOD = METHODS.PATIENT_MEDICAL_HISTORY_FORM;
  const SOURCE = {
    url: window.location.origin,
    name: 'My Medical History'
  };
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  let processing = false;
  let fetchError = '';

  interface HealthHistoryEntry {
    name: string;
    detail: string;
    date: string;
  };

  let defaults = {
    problem: {name: '', detail: '', date: ''},
    medication: {name: '', detail: '', date: ''},
    history: {name: '', detail: '', date: ''}
  }
  
  let defaultValues: Record<string, HealthHistoryEntry[]> = {
    problems: [copyOf(defaults.problem)],
    medications: [copyOf(defaults.medication)],
    history: [copyOf(defaults.history)]
  }
  
  let values = copyOf(defaultValues);

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

  function getProblemResources(rhs: ResourceHelper[]) {
    return rhs?.filter(rh => rh.resource.resourceType === 'Condition' && rh.resource.clinicalStatus?.coding?.find(c => c.code === 'active' && c.system === 'http://terminology.hl7.org/CodeSystem/condition-clinical')).map(r => r.resource);
  }

  function getMedicationResources(rhs: ResourceHelper[]) {
    return rhs?.filter(rh => rh.resource.resourceType === 'MedicationStatement').map(r => r.resource);
  }
  
  function getHistoryResources(rhs: ResourceHelper[]) {
    return rhs?.filter(rh => rh.resource.resourceType === 'Condition' && rh.resource.clinicalStatus?.coding?.find(c => c.code === 'inactive' && c.system === 'http://terminology.hl7.org/CodeSystem/condition-clinical')).map(r => r.resource);
  }
  
  function initializeProblemFields(rhs: ResourceHelper[]) {
    const problemResources = getProblemResources(rhs);
    let problems = [];
    for (const resource of problemResources) {
      const problem = {
        name: resource.code?.text ?? defaults.problem.name,
        detail: resource.severity?.text ?? defaults.problem.detail,
        date: resource.recordedDate ?? defaults.problem.date
      };
      problems.push(problem);
    }
    if (problems.length > 0) {
      values.problems = problems;
    } else {
      values.problems = [copyOf(defaults.problem)];
    }
  }

  function initializeMedicationFields(rhs: ResourceHelper[]) {
    const medicationResources = getMedicationResources(rhs);
    let medications = [];
    for (const resource of medicationResources) {
      const medication = {
        name: resource.medicationCodeableConcept.text ?? defaults.medication.name,
        detail: resource.dosage?.[0]?.text ?? defaults.medication.detail,
        date: resource.effectiveDateTime ?? defaults.medication.date
      };
      medications.push(medication);
    }
    if (medications.length > 0) {
      values.medications = medications;
    } else {
      values.medications = [copyOf(defaults.medication)];
    }
  }
  
  function initializeHistoryFields(rhs: ResourceHelper[]) {
    const historyResources = getHistoryResources(rhs);
    let histories = [];
    for (const resource of historyResources) {
      const history = {
        name: resource.code?.text ?? defaults.problem.name,
        detail: resource.onsetString ?? defaults.problem.detail,
        date: resource.recordedDate ?? defaults.problem.date
      };
      histories.push(history);
    }
    if (histories.length > 0) {
      values.history = histories;
    } else {
      values.history = [copyOf(defaults.history)];
    }
  }
  
  function initializeFieldsForFormData() {
    if (!$resources) { return initializeDefaultFields(); }
  
    const resources = Object.values($resources) as ResourceHelper[];
    if (!resources?.length) { return initializeDefaultFields(); }
    
    initializeProblemFields(resources);
    initializeMedicationFields(resources);
    initializeHistoryFields(resources);
  }
  
  function initializeDefaultFields() {
    values = copyOf(defaultValues);
  }

  function prepareProblemResource(entry: HealthHistoryEntry) {
    if (entry.name === '' && entry.detail === '') return;
    let currentCondition = JSON.parse(JSON.stringify(currentConditionTemplate));
    currentCondition.code.text = entry.name;
    currentCondition.severity.coding.push(issueSeverityOptions[entry.detail]);
    currentCondition.severity.text = entry.detail;
    currentCondition.recordedDate = new Date().toISOString().slice(0, 10);
    return currentCondition;
  }

  function prepareMedicationResource(entry: HealthHistoryEntry) {
    if (entry.name === '' && entry.detail === '') return;
    let medication = JSON.parse(JSON.stringify(medicationTemplate));
    medication.medicationCodeableConcept.text = entry.name;
    medication.dosage[0].text = entry.detail;
    medication.effectiveDateTime = new Date().toISOString().slice(0, 10);
    return medication;
  }

  function prepareHistoryResource(entry: HealthHistoryEntry) {
    if (entry.name === '' && entry.detail === '') return;
    let pastCondition = JSON.parse(JSON.stringify(pastConditionTemplate));
    pastCondition.code.text = entry.name;
    pastCondition.onsetString = entry.detail;
    pastCondition.recordedDate = new Date().toISOString().slice(0, 10);
    return pastCondition;
  }

  function prepareIps() {
    const currentConditions = values.problems.map(prepareProblemResource).filter((entry) => entry !== undefined);
    const medications = values.medications.map(prepareMedicationResource).filter((entry) => entry !== undefined);
    const pastConditions = values.history.map(prepareHistoryResource).filter((entry) => entry !== undefined);
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
    values[type] = [...values[type], {name: '', detail: ''}];
  }

  function removeEntry(type: string, i: number) {
    values[type].splice(i, 1);
    values[type] = values[type];
    if (values[type].length == 0) {
      addEntry(type);
    }
  }
</script>

<!-- <p class="text-secondary"><em>This section will show health issues found in your IPS, where they are from, and will let you remove existing health issues or add new issues that are important to you.</em></p> -->
<form on:submit|preventDefault={() => {}}>
  <h5>Ongoing Health Issues</h5>
  {#each values.problems as problem, i}
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
              <option style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">{option}</option>
            {/each}
          </Input>
        </FormGroup>
      </Col>
      <Col xs="auto" class="align-items-end">
        <Button color="danger" outline on:click={() => removeEntry('problems', i)}>
          {#if values.problems.length > 1}
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
      <Button color="secondary" outline style="width:fit-content" on:click={() => addEntry('problems')}><Icon name="plus"></Icon>Add another issue</Button>
    </Col>
  </Row>
  <h5>Medications I'm Taking Currently</h5>
  {#each values.medications as medication, i}
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
          {#if values.medications.length > 1}
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
      <Button color="secondary" outline style="width:fit-content" on:click={() => addEntry('medications')}><Icon name="plus"></Icon>Add another medication</Button>
    </Col>
  </Row>

  <h5>Past Events/Illnesses</h5>
  {#each values.history as history, i}
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
          {#if values.history.length > 1}
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
      <Button color="secondary" outline style="width:fit-content" on:click={() => addEntry('history')}><Icon name="plus"></Icon>Add another event/illness</Button>
    </Col>
  </Row>


  <Row>
    <Col xs="auto">
      <Button
        color="primary"
        style="width:fit-content"
        disabled={processing || disabled}
        on:click={FHIRDataServiceCheckerInstance?.checkFHIRDataServiceBeforeFetch(CATEGORY, METHOD, SOURCE.url, prepareIps)}>
        {#if !processing}
          Save your conditions, medications and history
        {:else}
          Saving...
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
