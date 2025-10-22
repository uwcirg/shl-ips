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
  } from 'sveltestrap';
  import { createEventDispatcher } from 'svelte';
  import type { ResourceRetrieveEvent } from '$lib/utils/types';
  import type { Goal, CompositionSection } from 'fhir/r4';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';

  const CATEGORY = 'patient-story';
  const SOURCE = {
    url: window.location.origin,
    name: 'Patient Provided Information'
  };
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;

  let processing = false;
  let fetchError = '';

  let story = '';
  let goals = [
    {value: '', checked: false}
  ];
  
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  let sectionTemplate: CompositionSection = {
    title: "Patient Story",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "81338-6",
          display: "Patient Story"
        }
      ]
    },
    text: {
      status: "generated",
      div: "<div xmlns=\"http://www.w3.org/1999/xhtml\"><p>[Patient Story]</p>\n<p><strong>Patient's Goals</strong></p>\n<ul>\n<li>Maintain blood sugar levels within normal range (in progress)</li>\n</ul>\n</div>"
    },
    extension: [
      {
        url: "http://healthintersections.com.au/fhir/StructureDefinition/patient-story",
        valueString: ""
      }
    ],
    entry: []
  };
  
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

  function prepareGoalResource(goal: any) {
    let goalResource = JSON.parse(JSON.stringify(goalResourceTemplate));
    goalResource.statusDate = new Date().toISOString().slice(0, 10);
    goalResource.description.text = goal.value;
    goalResource.achievementStatus.coding[0] = progressCodings[goal.checked ? "in-progress" : "not-achieved"];
    return goalResource;
  }



  function prepareIps() {
    const resources = goals.map(prepareGoalResource);
    const section = JSON.parse(JSON.stringify(sectionTemplate));
    section.text.div = `<div xmlns="http://www.w3.org/1999/xhtml"><p><strong>Patient Story</strong></p><p>${story}</p><p><strong>Patient's Goals</strong></p><ul>${goals.map(goal => `<li>${goal.value}</li>`).join('')}</ul></div>`;
    section.extension[0].valueString = story;
    processing = false;
    let result:ResourceRetrieveEvent = {
      resources: resources,
      category: CATEGORY,
      source: SOURCE,
    }
    resourceDispatch('update-resources', result);
    console.log(resources);
  }

  function addGoal() {
    goals = [...goals, {value: '', checked: false}];
  }

  function removeGoal(i: number) {
    goals.splice(i, 1);
    goals = goals;
    if (goals.length == 0) {
      addGoal();
    }
  }
</script>

<form on:submit|preventDefault={() => {}}>
  <p class="text-secondary"><em>Describe your story and goals for care.</em></p>
  <h5>My Story</h5>
  <Label class="text-secondary">Who are you? How would you describe your health? What matters to you?</Label>
  <Row>
    <Col>
      <FormGroup style="font-size:small" class="text-secondary">
        <Input type="textarea" bind:value={story} rows={4} />
      </FormGroup>
    </Col>
  </Row>
  <h5>My Goals</h5>
  <Label class="text-secondary">What specific outcomes are important to you from your care?</Label>
  {#each goals as goal, i}
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
          {#if goals.length > 1}
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
      <Button color="secondary" outline style="width:fit-content" on:click={addGoal}><Icon name="plus"></Icon>Add Goal</Button>
    </Col>
  </Row>

  <Row>
    <Col xs="auto">
      <Button
        color="primary"
        style="width:fit-content"
        disabled={processing}
        on:click={FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, SOURCE, prepareIps)}>
        {#if !processing}
          Update your patient story and goals
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
  </Row>
</form>
<FHIRDataServiceChecker bind:this={FHIRDataServiceCheckerInstance}/>
<span class="text-danger">{fetchError}</span>
