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

  let entries: Record<string, {name: string; detail: string}[]> = {
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
  
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  function prepareIps() {
    const resources = constructPatientResource();
    resourceDispatch('update-resources', resources);
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
<p class="text-secondary"><em>This section will show health issues found in your IPS, where they are from, and will let you remove existing health issues or add new issues that are important to you.</em></p>
<form on:submit|preventDefault={() => prepareIps()}>
  <h5>Ongoing Health Issues</h5>
  {#each entries.problems as problem, i}
    <Row class="mb-1">
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Health Issue">
          <Input type="text" bind:value={problem.name} style="width: 400px" />
        </FormGroup>
      </Col>
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Level">
          <Input type="select" bind:value={problem.detail} style="width: 200px">
            <option>Major life challenge</option>
            <option>Troublesome</option>
            <option>Background, but managed</option>
          </Input>
        </FormGroup>
      </Col>
      <Col xs="auto">
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
  <h5>Medications</h5>
  {#each entries.medications as problem, i}
    <Row class="mb-1">
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Medication">
          <Input type="text" bind:value={problem.name} style="width: 400px" />
        </FormGroup>
      </Col>
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Dosage">
          <Input type="text" bind:value={problem.detail} style="width: 200px" />
        </FormGroup>
      </Col>
      <Col xs="auto">
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
  {#each entries.history as problem, i}
    <Row class="mb-1">
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Event">
          <Input type="text" bind:value={problem.name} style="width: 400px" />
        </FormGroup>
      </Col>
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="When">
          <Input type="text" bind:value={problem.detail} style="width: 200px" />
        </FormGroup>
      </Col>
      <Col xs="auto">
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
      <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
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
  </Row>
</form>

<span class="text-danger">{fetchError}</span>
