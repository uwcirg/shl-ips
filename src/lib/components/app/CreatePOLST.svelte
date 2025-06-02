<script lang='ts'>
  import {
    Row,
    Col,
    Button,
    FormGroup,
    Icon,
    Input,
    Label,
    Spinner,
    Tooltip
  } from 'sveltestrap';
  import DemographicForm from '$lib/components/form/DemographicForm.svelte';
  import type { FormOption } from '$lib/utils/types';
  import { PDFDocument } from 'pdf-lib'
  import { demographics } from '$lib/stores/demographics';

  let processing = false;

  let conditionsAndGoals: string;
  let cpr: ('yes' | 'no') = 'yes';
  let cprOptions:FormOption[] = [
    {
      value: 'yes',
      label: 'Yes - Attempt Resuscitation/CPR',
      subtitle: '(You MUST select FULL TREATMENT in Section B)'
    },
    {
      value: 'no',
      label: 'No - Do Not Attempt Resuscitation (DNAR)/Allow Natural Death'
    }
  ]
  let medicalInterventions: ('full' | 'selective' | 'comfort') = 'full';
  let medicalInterventionsOptions:FormOption[] = [
    {
      value: 'full',
      label: 'Full Treatment',
      subtitle: 'Primary goal is prologinging life by all medically effective means.',
      info: 'Use intubation, advanced airway interventions, mechanical ventilation, and cardioversion as indicated. Includes care described in Selective and Comfort-Focused treatment options. Transfer to hospital if indicated. Includes intensive care.',
      show: false
    },
    {
      value: 'selective',
      label: 'Selective Treatment',
      subtitle: 'Primary goal is treating medical conditions while avoiding invasive measures whenever possible.',
      info: 'Use medical treatment, IV fluids and medications, and cardiac monitor as indicated. Do not intubate. May use less invasive airway support (e.g., CPAP, BiPAP, high-flow oxygen). Includes care described in Comfort-Focused treatment option. Transfer to hospital if indicated. Avoid intensive care if possible.',
      show: false
    },
    {
      value: 'comfortFocused',
      label: 'Comfort-Focused Treatment',
      subtitle: 'Primary goal is maximizing comfort.',
      info: 'Relieve pain and suffering with medication by any route as needed. Use oxygen, oral suction, and manual treatment of airway obstruction as needed for comfort. Individual prefers no transfer to hospital. EMS: consider contacting medical control to determine if transport is indicated to provide adequate comfort.',
      show: false
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


  async function generateIPS() {
    processing = true;
    const formUrl = '/polst-form.pdf';
    const formPdfBytes = await fetch(formUrl).then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.load(formPdfBytes);

    const form = pdfDoc.getForm();

    const fields = form.getFields();

    for (const field of fields) {
      console.log(`${field.constructor.name}: ${field.getName()}`);
      if (field.constructor.name === 'PDFRadioGroup2') {
        console.log(`    Options: ${field.getOptions().join(', ')}`);
      }
    };
    console.log($demographics.dob);

    let name = `${$demographics.last}, ${$demographics.first}`
    let dob = new Date($demographics.dob);
    let dobYear = dob.getFullYear().toString();
    let dobMonth = (dob.getMonth() + 1).toString();
    let dobDay = dob.getDate().toString();

    form.getTextField('additionalOrders').setText(additionalOrders);
    form.getSignature('mdSignature');
    // form.getCheckBox('nutritionDiscussed').check();
    // form.getRadioGroup('nutritionPreference').select();
    // form.getCheckBox('nutritionIndividual').check();
    // form.getCheckBox('nutritionHCP').check();
    // form.getCheckBox('nutritionLMDM').check();
    // form.getCheckBox('reviewOutcomeNewForm').check();
    // form.getCheckBox('reviewOutcomeFormVoided').check();
    form.getSignature('individualSignature');
    form.getTextField('name').setText(name);
    form.getTextField('dobMonth').setText(dobMonth);
    form.getTextField('dobDay').setText(dobDay);
    form.getTextField('dobYear').setText(dobYear);
    form.getTextField('gender').setText($demographics.gender);
    form.getTextField('conditionsAndGoals').setText(conditionsAndGoals);
    // form.getCheckBox('discussedIndividual').check();
    // form.getCheckBox('discussedParent').check();
    // form.getTextField('mdDate').setText();
    // form.getCheckBox('discussedGuardian').check();
    // form.getCheckBox('discussedAgent').check();
    // form.getTextField('mdPrint').setText();
    // form.getTextField('mdPhone').setText();
    // form.getCheckBox('discussedOther').check();
    form.getTextField('individualPrint').setText(name);
    // form.getCheckBox('dpoah').check();
    // form.getCheckBox('hcd').check();
    form.getTextField('name2').setText(name);
    // form.getTextField('dpoaName').setText();
    // form.getTextField('dpoaRelationship').setText();
    // form.getTextField('dpoaPhone').setText();
    // form.getTextField('contactName').setText();
    // form.getTextField('contactRelationship').setText();
    // form.getTextField('contactPhone').setText();
    // form.getTextField('hcpName').setText();
    // form.getTextField('hcpRole').setText();
    // form.getTextField('hcpPhone').setText();
    // form.getTextField('reviewDate').setText();
    // form.getTextField('reviewer').setText();
    // form.getTextField('reviewLocation').setText();
    // form.getTextField('agencyInfo').setText();
    // form.getTextField('pronouns').setText();
    // form.getTextField('individualRelationship').setText();
    // form.getTextField('individualDate').setText();
    // form.getTextField('individualPhone').setText();
    form.getRadioGroup('sectionACPR').select(cpr);
    form.getRadioGroup('sectionBMedicalInterventionLevel').select(medicalInterventions);
    // form.getCheckBox('reviewOutcomeNoChange').check();
    form.getTextField('dob2month').setText(dobMonth);
    form.getTextField('dob2day').setText(dobDay);
    form.getTextField('dob2year').setText(dobYear);

    //form.flatten(); // Optional, finalizes form

    const pdfBytes = await pdfDoc.save();

    var blob = new Blob([pdfBytes], {type: "application/pdf"});
    var link = window.URL.createObjectURL(blob);
    window.open(link,'', 'height=650,width=840');

    processing = false;
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
          <Label class="mb-0">
            <Row style="overflow:hidden">
              <Col xs=auto class="d-flex align-items-top pe-0">
                <Input type="radio" bind:group={cpr} value={option.value}/>
              </Col>
              <Col class="justify-content-center align-items-center px-0">
                {option.label}
                {#if option.subtitle}
                  <br><span style="font-size:small" class="ms-1 mt-0 mb-1 text-secondary">{option.subtitle}</span><br>
                {/if}
                {#if option.info}
                  <p style="font-size:small" class="text-secondary">{option.info}</p>
                {/if}
              </Col>
            </Row>
          </Label><br>
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
        {#each medicalInterventionsOptions as option, index}
          <Label class="mb-0">
            <Row style="overflow:hidden">
              <Col xs=auto class="d-flex align-items-top pe-0">
                <Input type="radio" bind:group={medicalInterventions} value={option.value}/>
              </Col>
              <Col class="justify-content-center align-items-center px-0">
                {option.label}
                {#if option.info}
                  <Icon 
                    name="info-circle"
                    id={`info-med-${index}`}
                    on:click={() => option.show = !option.show}
                    style="cursor: pointer;"
                    role="button"
                    tabindex="0"
                    aria-controls={`info-med-${index}`}/>
                  <Tooltip bind:isOpen={option.show} placement="right" target={`info-med-${index}`}>
                    {option.info}
                  </Tooltip>
                {/if}
                {#if option.subtitle}
                  <br><span style="font-size:small" class="ms-1 mt-0 mb-1 text-secondary">{option.subtitle}</span><br>
                {/if}
              </Col>
            </Row>
          </Label><br>
        {/each}
      </FormGroup>
    </Col>
  </Row>
  <Row>
    <Col>
      <FormGroup>
        <Label>Additional orders (e.g. blood products, dialysis):</Label>
        <Input type="textarea" class="form-control" bind:value={additionalOrders}></Input>
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
          Review and Sign
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
