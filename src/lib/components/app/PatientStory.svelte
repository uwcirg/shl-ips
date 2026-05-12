<script lang="ts">
  import {
    Button,
    Col,
    FormGroup,
    Icon,
    Input,
    Label,
    Row,
    Spinner
  } from '@sveltestrap/sveltestrap';
  import { createEventDispatcher } from 'svelte';
  import type { IResourceCollection, ResourceRetrieveEvent } from '$lib/utils/types';
  import type { Goal, Observation, Resource } from 'fhir/r4';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';
  import { METHODS, CATEGORIES } from '$lib/config/tags';
  import { ResourceHelper } from '$lib/utils/ResourceHelper';
  import { copyOf } from '$lib/utils/util';

  export let disabled = false;
  export let formData: IResourceCollection | undefined;
  export let processing = false;
  
  let buttonText = "Save your story and goals";
  let processingText = "Saving...";

  let resources;
  $: resources = formData?.resources;
  $: if ($resources) {
    initializeFieldsForFormData();
  } else {
    initializeDefaultFields();
  }

  const CATEGORY = CATEGORIES.PATIENT_STORY;
  const METHOD = METHODS.PATIENT_STORY_FORM;
  const SOURCE = {
    url: window.location.origin,
    name: 'My Story'
  };
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  let fetchError = '';

  let defaults = {
    story: '',
    goal: {value: '', checked: false, date: ""}
  }

  let defaultValues = {
    story: defaults.story,
    goals: [copyOf(defaults.goal)]
  }

  let values = copyOf(defaultValues);

  let observationResourceTemplate: Observation = {
    resourceType: "Observation",
    status: "final",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "51855-5",
          display: "Patient Note"
        }
      ]
    },
    valueString: "",
    subject: {
      reference: "Patient/pat1"
    },
  }
  
  let goalResourceTemplate: Goal = {
    resourceType: "Goal",
    lifecycleStatus: "active",
    subject: {
      reference: "Patient/pat1"
    },
    statusDate: "",
    description: {
      text: ""
    },
    achievementStatus: {
      coding: []
    },
    text: {
      status: "generated",
      div: "<div xmlns=\"http://www.w3.org/1999/xhtml\"><p></p><p></p></div>"
    }
  };

  let progressCodings = {
    "in-progress": {
      "system": "http://terminology.hl7.org/CodeSystem/goal-achievement",
      "code": "in-progress",
      "display": "In Progress"
    },
    "not-achieved": {
      "system": "http://terminology.hl7.org/CodeSystem/goal-achievement",
      "code": "not-achieved",
      "display": "Not Achieved"
    }
  };

  function getStoryResource(rhs: ResourceHelper[]) {
    return rhs?.filter(rh => rh.resource.resourceType === 'Observation' && rh.resource.code?.coding?.find(c => c.code === '51855-5' && c.system === 'http://loinc.org')).map(r => r.resource).pop();
  }

  function getGoalResources(rhs: ResourceHelper[]) {
    return rhs?.filter(rh => rh.resource.resourceType === 'Goal').map(r => r.resource);
  }

  function initializeStoryFields(rhs: ResourceHelper[]) {
    const storyResource = getStoryResource(rhs);
    if (!storyResource) { return; }
    values.story = storyResource.valueString ?? "";
  }
  
  function initializeGoalFields(rhs: ResourceHelper[]) {
    const goalResources = getGoalResources(rhs);
    let goals = [];
    for (const resource of goalResources) {
      const goal = {
        value: resource.description.text ?? defaults.goal.value,
        checked: resource.achievementStatus?.coding?.[0]?.code === "in-progress",
        date: resource.statusDate ?? defaults.goal.date
      };
      goals.push(goal);
    }
    if (goals.length > 0) {
      values.goals = goals;
    } else {
      values.goals = [copyOf(defaults.goal)];
    }
  }

  function initializeFieldsForFormData() {
    if (!$resources) { return; }
  
    const resources = Object.values($resources) as ResourceHelper[];
    if (!resources?.length) { return; }
    
    initializeStoryFields(resources);
    initializeGoalFields(resources);
  }

  function initializeDefaultFields() {
    values = copyOf(defaultValues);
  }

  function addGoal() {
    values.goals = [...values.goals, copyOf(defaults.goal)];
  }
  
  function removeGoal(i: number) {
    values.goals.splice(i, 1);
    values.goals = values.goals;
    if (values.goals.length == 0) {
      addGoal();
    }
    values = values;
  }

  function prepareGoalResource(goal: any) {
    if (!goal.value) {
      return;
    }
    let goalResource = JSON.parse(JSON.stringify(goalResourceTemplate));
    goalResource.statusDate = new Date().toISOString().slice(0, 10);
    goalResource.description.text = goal.value;
    goalResource.achievementStatus.coding[0] = progressCodings[goal.checked ? "in-progress" : "not-achieved"];
    return goalResource;
  }

  function prepareObservationResource() {
    if (!values.story) {
      return;
    }
    let observationResource = JSON.parse(JSON.stringify(observationResourceTemplate));
    observationResource.valueString = values.story;
    return observationResource;
  }

  function prepareIps() {
    let resources: Resource[] = [];
    let goalResources = values.goals.map(prepareGoalResource).filter((entry) => entry);
    if (goalResources.length > 0) {
      resources = [...resources, ...goalResources];
    }
    let observationResource = prepareObservationResource();
    if (observationResource) {
      resources.push(observationResource);
    }
    if (resources.length == 0) {
      return;
    }

    let result:ResourceRetrieveEvent = {
      resources: resources,
      category: CATEGORY,
      method: METHOD,
      source: SOURCE.url,
      sourceName: SOURCE.name
    }
    resourceDispatch('update-resources', result);
    console.log(resources);
  }
</script>

<form on:submit|preventDefault={() => {}}>
  <h5>My Story</h5>
  <Label class="text-secondary">Who are you? How would you describe your health? What matters to you?</Label>
  <Row>
    <Col>
      <FormGroup style="font-size:small" class="text-secondary">
        <Input type="textarea" bind:value={values.story} rows={4} />
      </FormGroup>
    </Col>
  </Row>
  <h5>My Goals</h5>
  <Label class="text-secondary">What specific outcomes are important to you from your care?</Label>
  {#each values.goals as goal, i}
    <Row class="mb-1">
      <Col>
        <FormGroup style="font-size:small" class="text-secondary" label="Goal">
          <Input type="text" bind:value={goal.value}/>
        </FormGroup>
      </Col>
      <Col xs="auto" class="pt-1">
        <Input type="checkbox" bind:checked={goal.checked} label="Making Progress" />
      </Col>
      <Col xs="auto">
        <Button color="danger" outline on:click={() => removeGoal(i)}>
          {#if values.goals.length > 1}
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
      <Button color="secondary" outline style="width:fit-content" on:click={addGoal}><Icon name="plus"></Icon>Add another goal</Button>
    </Col>
  </Row>

<Row>
  <Col xs="auto">
    <Button
      color="primary"
      style="width:fit-content"
      disabled={processing || disabled}
      on:click={() => FHIRDataServiceCheckerInstance?.checkFHIRDataServiceBeforeFetch(CATEGORY, METHOD, SOURCE.url, prepareIps)}
    >
      {processing ? processingText : buttonText}
    </Button>
  </Col>
  <Col xs="auto" class="d-flex align-items-center px-0">
    {#if disabled}
      Please wait...
    {:else if processing}
      <Spinner color="primary" type="border" size="md"/>
    {/if}
  </Col>
</Row>
</form>
<FHIRDataServiceChecker bind:this={FHIRDataServiceCheckerInstance}/>
<span class="text-danger">{fetchError}</span>
