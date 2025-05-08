<script lang='ts'>
  import { Row, Col, Button, FormGroup, Input, Label, Spinner } from 'sveltestrap';
  import DemographicForm from '$lib/components/form/DemographicForm.svelte';
  import type { FormOption } from '$lib/utils/types';

  let processing = false;

  let conditionsAndGoals: string;
  let cpr: ('yes' | 'no');
  let cprOptions:FormOption[] = [
    {
      value: 'yes',
      label: 'Yes - Attempt Resuscitation/CPR',
      subtitle: '(Must select FULL TREATMENT in Section B)'
    },
    {
      value: 'no',
      label: 'No - Do Not Attempt Resuscitation (DNAR)/Allow Natural Death'
    }
  ]
  let medicalInterventions: ('full' | 'selective' | 'comfort');
  let medicalInterventionsOptions:FormOption[] = [
    {
      value: 'full',
      label: 'Full Treatment',
      subtitle: 'Primary goal is prologinging life by all medically effective means.',
      info: 'Use intubation, advanced airway interventions, mechanical ventilation, and cardioversion as indicated. Includes care described below. Transfer to hospital if indicated. Includes intensive care.'
    },
    {
      value: 'selective',
      label: 'Selective Treatment',
      subtitle: 'Primary goal is treating medical conditions while avoiding invasive measures whenever possible.',
      info: 'Use medical treatment, IV fluids and medications, and cardiac monitor as indicated. Do not intubate. May use less invasive airway support (e.g., CPAP, BiPAP, high-flow oxygen). Includes care described below. Transfer to hospital if indicated. Avoid intensive care if possible.'
    },
    {
      value: 'comfort',
      label: 'Comfort-Focused Treatment',
      subtitle: 'Primary goal is maximizing comfort.',
      info: 'Relieve pain and suff  ering with medication by any route as needed. Use oxygen, oral suction, and manual treatment of airway obstruction as needed for comfort. Individual prefers no transfer to hospital. EMS: consider contacting medical control to determine if transport is indicated to provide adequate comfort.'
    }
  ]
  let additionalOrders: string;
  let discussedArtificialNutrition: ('individual' | 'hcp' | 'lmdm' | 'no');
  let artificialNutrition: ('avoid' | 'discuss' | '');
  let artificialNutritionOptions:FormOption[] = [
    {
      value: 'avoid',
      label: 'Preference is to avoid medically assisted nutrition.'
    },
    {
      value: 'discuss',
      label: 'Preference is to discuss medically assisted nutrition options, as indicated',
      subtitle: 'Discuss short- versus long-term medically assisted nutrition (long-term requires surgical placement of tube).',
      info: 'Medically assisted nutrition is proven to have no effect on length of life in moderate- to late-stage dementia, and it is associated with complications. People may have documents or known wishes to not have oral feeding continued; the directions for oral feeding may be subject to these known wishes.'
    }
  ]


  function generateIPS() {

  }

</script>


<form on:submit|preventDefault={() => generateIPS()}>
  <Row>
    <Col>
      <DemographicForm show={['first', 'last', 'gender', 'dob', 'phone']} />
    </Col>
  </Row>
  <Row>
    <Col>
      <FormGroup>
        <Label>Use of Cardiopulmonary Resuscitation (CPR):</Label>
        <span style="font-size:small" class="text-secondary">(When the individual has NO pulse and is not breathing)</span>
        {#each cprOptions as option}
          <Input type="radio" bind:group={cpr} value={option.value} label={option.label} />
        {/each}
      </FormGroup>
    </Col>
  </Row>
  <Row>
    <Col>
      <FormGroup>
        <Label>Level of Medical Interventions:</Label>
        <span style="font-size:small" class="text-secondary">(When the individual has a pulse and/or is breathing.)</span>
        <p style="font-size:small" class="text-secondary">Any of these treatment levels may be paired with "DNAR / Allow Natural Death" above.</p>
        {#each medicalInterventionsOptions as option}
          <Input type="radio" bind:group={medicalInterventions} value={option.value} label={option.label} />
        {/each}
      </FormGroup>
    </Col>
  </Row>
  <Row>
    <Col>
      <FormGroup>
        <Label>Additional orders (e.g. blood products, dialysis):</Label>
        <Input type="textarea" class="form-control" bind:value={additionalOrders} required></Input>
      </FormGroup>
    </Col>
  </Row>
  <Row>
    <Col>
      <FormGroup>
        <Label>Medical Conditions/Individual Goals</Label>
        <Input type="textarea" class="form-control" bind:value={conditionsAndGoals}></Input>
      </FormGroup>
    </Col>
  </Row>
  <Label>Additional Contact Information (if any)</Label>
  <FormGroup style="font-size:small" class="text-secondary">
    <Row>
      <Col xs="6">
        <Input type="text" />
        <Label>Legal Medical Decision Maker(s) (DPOA-HC or 7.70.065 RCW)</Label>
      </Col>
      <Col xs="3">
        <Input type="text" />
        <Label>Relationship</Label>
      </Col>
      <Col xs="3">
        <Input type="phone" />
        <Label>Phone</Label>
      </Col>
    </Row>
    <Row>
      <Col xs="6">
        <Input type="text" />
        <Label>Other Contact Person</Label>
      </Col>
      <Col xs="3">
        <Input type="text" />
        <Label>Relationship</Label>
      </Col>
      <Col xs="3">
        <Input type="phone" />
        <Label>Phone</Label>
      </Col>
    </Row>
    <Row>
      <Col xs="6">
        <Input type="text" />
        <Label>Health Care Professional Completing Form</Label>
      </Col>
      <Col xs="3">
        <Input type="text" />
        <Label>Relationship</Label>
      </Col>
      <Col xs="3">
        <Input type="phone" />
        <Label>Phone</Label>
      </Col>
    </Row>
  </FormGroup>
  <Row>
    <Col xs="auto">
      <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
        {#if !processing}
          Continue
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
  </Row>
</form>
