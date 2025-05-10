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
  import { constructPatientResource } from '$lib/utils/util';
  import type { ResourceRetrieveEvent } from '$lib/utils/types';

  let processing = false;
  let fetchError = '';

  let story = '';
  let goals = [
    {value: '', checked: false}
  ];
  
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  function prepareIps() {
    const resources = constructPatientResource();
    resourceDispatch('update-resources', resources);
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

<form on:submit|preventDefault={() => prepareIps()}>
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
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Goal">
          <Input type="text" bind:value={goal.value} style="width: 400px"/>
        </FormGroup>
      </Col>
      <Col xs="auto" class="pt-1">
        <Input type="checkbox" bind:value={goal.checked} label="Making Progress" />
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
      <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
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

<span class="text-danger">{fetchError}</span>
