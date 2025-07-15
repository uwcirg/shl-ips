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
  import { createEventDispatcher } from 'svelte';
  import DemographicForm from '$lib/components/form/DemographicForm.svelte';
  import type { FormOption } from '$lib/utils/types';
  import { PDFDocument } from 'pdf-lib'
  import { demographics } from '$lib/stores/demographics';
  import type { ResourceRetrieveEvent } from '$lib/utils/types';

  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  let processing = false;

  const forms: Record<string, any> = {
    full: {
      url: '/polst-form-signatures.pdf',
      resultBytes: undefined
    },
    // Necessary for form flattening in preview display, as PDFLib does not support form flattening blank signatures
    noSignature: {
      url: '/polst-form-no-signatures.pdf',
      resultBytes: undefined
    }
  }
  let pdfPreviewSrc: string;
  let finalizedEncoding: string;

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
  let artificialNutrition: ('avoid' | 'discuss' | '') = 'discuss';
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

  let dpoaName: string;
  let dpoaRelationship: string;
  let dpoaPhone: string;
  let contactName: string;
  let contactRelationship: string;
  let contactPhone: string;
  let hcpName: string;
  let hcpRole: string;
  let hcpPhone: string;

  function ensureText(v: string | undefined) {
    if (v === "" || v === undefined) {
      // Empty string results in an undefined value
      return ' ';
    }
    return v;
  }
  
  async function generatePreview() {
    processing = true;

    if (pdfPreviewSrc) {
      window.URL.revokeObjectURL(pdfPreviewSrc);
    }

    for (const formKey of Object.keys(forms)) {
      const formPdfBytes = await fetch(forms[formKey].url).then(res => res.arrayBuffer());

      const pdfDoc = await PDFDocument.load(formPdfBytes);

      const form = pdfDoc.getForm();

      let fields = form.getFields();

      for (const field of fields) {
        console.log(`${field.constructor.name}: ${field.getName()}`);
        if (field.constructor.name === 'PDFRadioGroup2') {
          console.log(`    Options: ${field.getOptions().join(', ')}`);
        }
      };

      let name = `${$demographics.last ?? ""}, ${$demographics.first ?? ""}`;
      // Parse date in local time by appending plain time suffix
      let dob = $demographics.dob ? new Date($demographics.dob+"T00:00:00") : undefined;
      let dobYear = dob?.getFullYear()?.toString() ?? " ";
      let dobMonth = dob?.getMonth() !== undefined ? (dob?.getMonth() + 1).toString() : " ";
      let dobDay = dob?.getDate()?.toString() ?? " ";

      form.getTextField('additionalOrders').setText(ensureText(additionalOrders));
      // form.getSignature('mdSignature');
      form.getCheckBox('nutritionDiscussed').check();
      // form.getRadioGroup('nutritionPreference').select(artificialNutrition);
      // form.getCheckBox('nutritionIndividual').check();
      // form.getCheckBox('nutritionHCP').check();
      // form.getCheckBox('nutritionLMDM').check();
      // form.getCheckBox('reviewOutcomeNewForm').check();
      // form.getCheckBox('reviewOutcomeFormVoided').check();
      // form.getSignature('individualSignature');
      form.getTextField('name').setText(ensureText(name));
      form.getTextField('dobMonth').setText(ensureText(dobMonth));
      form.getTextField('dobDay').setText(ensureText(dobDay));
      form.getTextField('dobYear').setText(ensureText(dobYear));
      form.getTextField('gender').setText(ensureText($demographics.gender));
      form.getTextField('conditionsAndGoals').setText(ensureText(conditionsAndGoals));
      // form.getCheckBox('discussedIndividual').check();
      // form.getCheckBox('discussedParent').check();
      form.getTextField('mdDate').setText(" ");
      // form.getCheckBox('discussedGuardian').check();
      // form.getCheckBox('discussedAgent').check();
      form.getTextField('mdPrint').setText(" ");
      form.getTextField('mdPhone').setText(" ");
      // form.getCheckBox('discussedOther').check();
      form.getTextField('individualPrint').setText(ensureText(name));
      // form.getCheckBox('dpoah').check();
      // form.getCheckBox('hcd').check();
      form.getTextField('name2').setText(ensureText(name));
      form.getTextField('dpoaName').setText(ensureText(dpoaName));
      form.getTextField('dpoaRelationship').setText(ensureText(dpoaRelationship));
      form.getTextField('dpoaPhone').setText(ensureText(dpoaPhone));
      form.getTextField('contactName').setText(ensureText(contactName));
      form.getTextField('contactRelationship').setText(ensureText(contactRelationship));
      form.getTextField('contactPhone').setText(ensureText(contactPhone));
      form.getTextField('hcpName').setText(ensureText(hcpName));
      form.getTextField('hcpRole').setText(ensureText(hcpRole));
      form.getTextField('hcpPhone').setText(ensureText(hcpPhone));
      form.getTextField('reviewDate').setText(" ");
      form.getTextField('reviewer').setText(" ");
      form.getTextField('reviewLocation').setText(" ");
      form.getTextField('agencyInfo').setText(" ");
      form.getTextField('pronouns').setText(" ");
      form.getTextField('individualRelationship').setText(" ");
      form.getTextField('individualDate').setText(" ");
      form.getTextField('individualPhone').setText(" ");
      form.getRadioGroup('sectionACPR').select(cpr);
      form.getRadioGroup('sectionBMedicalInterventionLevel').select(medicalInterventions);
      // form.getCheckBox('reviewOutcomeNoChange').check();
      form.getTextField('dob2month').setText(ensureText(dobMonth));
      form.getTextField('dob2day').setText(ensureText(dobDay));
      form.getTextField('dob2year').setText(ensureText(dobYear));

      form.updateFieldAppearances();

      for (const field of fields) {
        const name = field.getName();
        const type = field.constructor.name;

        let value: string | undefined;

        if (type === 'PDFTextField2') {
          value = (field as any).getText();
        } else if (type === 'PDFDropdown2') {
          value = (field as any).getSelected();
        } else if (type === 'PDFRadioGroup2') {
          value = (field as any).getSelected();
          let kids = field.acroField.Kids();
          if (kids) {
            for (let i = 0; i < kids.size(); i++) {
              const kid = kids.get(i);
              const dict = kid?.dict;
              const ap = dict?.get('AP');
              console.log(`Kid ${i} appearance stream:`, ap?.entries ?? 'No /AP');
            }
          }
        } else if (type === 'PDFCheckBox2') {
          value = (field as any).isChecked() ? 'Checked' : 'Unchecked';
        } else {
          value = '[Unknown type]';
        }

        console.log(`${name} (${type}): ${value}`);
      }

      if (formKey === 'noSignature') {
        // TODO try with official adobe pdf template for /AF form flattening
        form.flatten(); // Optional, finalizes form
      }
      const pdfBytes = await pdfDoc.save();

      forms[formKey].resultBytes = pdfBytes;
    }

    if (forms.noSignature.resultBytes) {
      let blob = new Blob([forms.noSignature.resultBytes], {type: "application/pdf"});
      pdfPreviewSrc = window.URL.createObjectURL(blob);
    }

    // TODO Change back to template w/signature when signing is figured out
    if (forms.noSignature.resultBytes) {
      let blob = new Blob([forms.noSignature.resultBytes], { type: 'application/pdf' });
      const reader = new FileReader();
      reader.onload = () => {
        finalizedEncoding = (reader.result as string).split(',')[1]; // remove data: URL prefix
        document.getElementById("pdf-preview")?.scrollIntoView({behavior: "smooth"});
      };
      reader.readAsDataURL(blob);
    }
    processing = false;
  }

  let sectionKey = "Advance Directives";

  let sectionTemplate = {
    title: "Advance Directives",
    code: {
      coding: [
      {
        system: "http://loinc.org",
        code: "42348-3",
        display: "Advance Directives"
      }
      ]
    },
    entry: []
  };

  let resourceTemplate = {
    resourceType: "DocumentReference",
    status: "current",
    docStatus: "final",
    type: {
      coding: [
        {
          system: "http://loinc.org",
          code: "100821-8",
          display: "National POLST form: portable medical order panel"
        }
      ]
    },
    category: [
      {
        coding: [
          {
            system: "http://loinc.org",
            code: "42348-3",
            display: "Advance Healthcare Directive"
          }
        ]
      }
    ],
    subject: {
      reference: "Patient/14599"
    },
    date: "",
    description: "National ePOLST Form: A Portable Medical Order\n    - Version 1",
    securityLabel: [
      {
        coding: [
          {
            system: "http://hl7.org/fhir/v3/Confidentiality",
            code: "N",
            display: "normal"
          }
        ]
      }
    ],
    content: [
      {
        attachment: {
          contentType: "application/pdf",
          creation: "",
          data: ""  
        }
      }
    ]
  };

  function submit() {
    processing = true;
    let resource = JSON.parse(JSON.stringify(resourceTemplate));
    resource.content[0].attachment.data = finalizedEncoding;
    let createdDate = new Date().toISOString();
    resource.content[0].attachment.creation = createdDate;
    resource.date = createdDate;
    let resources = [resource];
    processing = false;
    let result:ResourceRetrieveEvent = {
      resources: resources,
      sectionKey: sectionKey,
      sectionTemplate: sectionTemplate
    }
    resourceDispatch('update-resources', result);
  }

</script>

<form on:submit|preventDefault={() => {}}>
  <p>To prepare a new POLST form, specify your preferences below.</p>
  <DemographicForm demographics={demographics} show={['first', 'last', 'gender', 'dob', 'phone']} />
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
        <Input type="text" bind:value={dpoaName} />
        <Label>Legal Medical Decision Maker(s) (DPOA-HC or 7.70.065 RCW)</Label>
      </Col>
      <Col xs="3">
        <Input type="text" bind:value={dpoaRelationship} />
        <Label>Relationship</Label>
      </Col>
      <Col xs="3">
        <Input type="phone" bind:value={dpoaPhone} />
        <Label>Phone</Label>
      </Col>
    </Row>
    <Row>
      <Col xs="6">
        <Input type="text" bind:value={contactName} />
        <Label>Other Contact Person</Label>
      </Col>
      <Col xs="3">
        <Input type="text" bind:value={contactRelationship} />
        <Label>Relationship</Label>
      </Col>
      <Col xs="3">
        <Input type="phone" bind:value={contactPhone} />
        <Label>Phone</Label>
      </Col>
    </Row>
    <Row>
      <Col xs="6">
        <Input type="text" bind:value={hcpName} />
        <Label>Health Care Professional Completing Form</Label>
      </Col>
      <Col xs="3">
        <Input type="text" bind:value={hcpRole} />
        <Label>Role</Label>
      </Col>
      <Col xs="3">
        <Input type="phone" bind:value={hcpPhone} />
        <Label>Phone</Label>
      </Col>
    </Row>
  </FormGroup>
  <Row>
    <Col xs="auto">
      <Button color="primary" style="width:fit-content" disabled={processing} on:click={generatePreview}>
        {#if !processing}
          Generate Preview
        {:else}
          Generating...
        {/if}
      </Button>
    </Col>
    {#if processing}
      <Col xs="auto" class="d-flex align-items-center px-0">
        <Spinner color="primary" type="border" size="md"/>
      </Col>
    {/if}
  </Row>
  {#if pdfPreviewSrc}
    <Row class="mt-4">
      <Col>
        <div>
          <embed id="pdf-preview" src={pdfPreviewSrc} type="application/pdf" width="100%" height="800px" />
        </div>
      </Col>
    </Row>
    <Row class="my-4">
      <Col xs="auto">
        <Button color="primary" style="width:fit-content" disabled={processing} on:click={submit}>
          {#if !processing}
            Sign Document and Save
          {:else}
            Submitting...
          {/if}
        </Button>
      </Col>
      {#if processing}
        <Col xs="auto" class="d-flex align-items-center px-0">
          <Spinner color="primary" type="border" size="md"/>
        </Col>
      {/if}
    </Row>
    <Row>
      <Col>
        <span class="text-secondary"><em><strong>Plan to add eSignature, but for now users would print to confirm content, physically sign to confirm with WA regulations, then upload the final document. We see moving past upload as important for scalability, once workflows are developed and regulations support eSignature</strong></em></span>
      </Col>
    </Row>
  {/if}
</form>
