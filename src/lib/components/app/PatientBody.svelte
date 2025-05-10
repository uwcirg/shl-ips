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

  let bodyPartStatuses: Array<{bodyPart: string; side: string; status: string}> = [
    {bodyPart: '', side: '', status: ''}
  ];

  let bodyParts = [
    "Arm",
    "Hand",
    "Fingers",
    "Leg",
    "Calf",
    "Foot",
    "Toe",
    "Hip",
    "Eye",
    "Hypothalamus",
    "Pituitary",
    "Tongue",
    "Jaw",
    "Oesophagus",
    "Large Colon",
    "Stomach",
    "Gall Bladder",
    "Kidney",
    "Liver",
    "Bladder",
    "Lung",
    "Breasts",
    "Ovary",
    "Uterus",
    "Cervix",
    "Vagina",
    "Penis",
    "Prostate",
    "Testis"
  ];

  let sides = [
    "",
    "Left",
    "Right",
    "Both"
  ];

  let statusOptions = [
    "Present",
    "Transplanted In /(re)constructed",
    "Implant / Prosthesis",
    "Missing",
    "Not Present at Birth",
    "Partially Surgically Removed",
    "Lost in accident/attack",
    "Surgically Removed"
  ]
    
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  function prepareIps() {
    const resources = constructPatientResource();
    resourceDispatch('update-resources', resources);
  }

  function addStatus() {
    bodyPartStatuses = [...bodyPartStatuses, {bodyPart: '', side: '', status: ''}];
  }

  function removeBodyPart(i: number) {
    bodyPartStatuses.splice(i, 1);
    bodyPartStatuses = bodyPartStatuses;
    if (bodyPartStatuses.length == 0) {
      addStatus();
    }
  }
</script>

<form on:submit|preventDefault={() => prepareIps()}>
  <h5>My Body</h5>
  <Label class="text-secondary">You can record brief concerns about any specific part of your body here.</Label>
  {#each bodyPartStatuses as status, i}
    <Row>
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Body Part">
          <Input type="select" bind:value={status.bodyPart}>
            {#each bodyParts as bodyPart}
              <option>{bodyPart}</option>
            {/each}
          </Input>
        </FormGroup>
      </Col>
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Side">
          <Input type="select" bind:value={status.side}>
            {#each sides as side}
              <option>{side}</option>
            {/each}
          </Input>
        </FormGroup>
      </Col>
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="What is the concern?">
          <!-- <Input type="select" bind:value={status.status} style="width: 165px">
            {#each statusOptions as option}
              <option>{option}</option>
            {/each}
          </Input> -->
          <Input type="text" bind:value={status.status}/>
        </FormGroup>
      </Col>
      <Col xs="auto">
        <Button color="danger" outline on:click={() => removeBodyPart(i)}>
          {#if bodyPartStatuses.length > 1}
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
      <Button color="secondary" outline style="width:fit-content" on:click={addStatus}><Icon name="plus"></Icon>Add Another Issue</Button>
    </Col>
  </Row>
  <Row>
    <Col xs="auto">
      <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
        {#if !processing}
        Update your body concerns
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
