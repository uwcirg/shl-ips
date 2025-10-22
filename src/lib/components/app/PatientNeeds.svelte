<script lang="ts">
  import {
    Button,
    Col,
    FormGroup,
    Input,
    Label,
    Row,
    Spinner
  } from 'sveltestrap';
  import { createEventDispatcher } from 'svelte';
  import type { ResourceRetrieveEvent } from '$lib/utils/types';
  import type { CodeableConcept, Condition } from 'fhir/r4';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';

  const CATEGORY = 'patient-care-needs';
  const SOURCE = {
    url: window.location.origin,
    name: 'Patient Provided Information'
  };
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;

  let processing = false;
  let fetchError = '';
  
  interface ConditionOption { checked: boolean, code: CodeableConcept };
  let conditions: Record<string, ConditionOption> = {
    // Concerns
    concern_visual: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "397540003",
              "display": "Visual impairment"
            }
    },
    concern_audio: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "15188001",
              "display": "Hearing impaired"
            }
    },
    concern_cognition: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "386806002",
              "display": "Impaired cognition"
            }
    },
    concern_speaking: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "29164008",
              "display": "Speech impairment"
            }
    },
    concern_mobility: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "82971005",
              "display": "Impaired mobility"
            }
    },
    concern_gender: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "93461009",
              "display": "Gender dysphoria"
            }
    },
    concern_memory: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "386807006",
              "display": "Memory impairment"
            }
    },
    concern_trauma: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "161472001",
              "display": "History of psychological trauma"
            }
    },
    concern_focus: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "1144748009",
              "display": "Impaired concentration"
            }
    },
    concern_addiction: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "32709003",
              "display": "Addiction"
            }
    },
    concern_city: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "5794003",
              "display": "Country dweller"
            }
    },
    // Help
    eating: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "110292000",
              "display": "Difficulty eating"
            }
    },
    toileting: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "284911003",
              "display": "Difficulty using toilet"
            }
    },
    bed_exit: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "301666002",
              "display": "Difficulty getting on and off a bed"
            }
    },
    bed_in: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "301685004",
              "display": "Difficulty moving in bed"
            }
    },
    orientation: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "72440003",
              "display": " Disorientated in place"
            }
    },
    dressing: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "284977008",
              "display": "Difficulty dressing"
            }
    },
    bathing: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "284807005",
              "display": "Difficulty bathing self"
            }
    },
    meds: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "715037005",
              "display": "Difficulty taking medication"
            }
    },
    reading: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "309253009",
              "display": "Difficulty reading"
            }
    },
    // Aids
    dog: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "105506000",
              "display": "Dependence on seeing eye dog"
            }
    },
    wheelchair: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "105503008",
              "display": "Dependence on wheelchair"
            }
    },
    comm_device: {
      checked: false,
      code: {
              "system": "http://snomed.info/sct",
              "code": "719369003",
              "display": "Uses communication device"
            }
    },
  };

  let additionalInfo = '';
    
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  let conditionTemplate: Condition = {
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
      coding: []
    }
  };

  function prepareConditionResource(conditionOption: ConditionOption) {
    let condition = JSON.parse(JSON.stringify(conditionTemplate));
    condition.code.coding.push(conditionOption.code);
    condition.recordedDate = new Date().toISOString().slice(0, 10);
    return condition;
  }

  function prepareIps() {
    const resources = Object.values(conditions).filter(c => c.checked).map(prepareConditionResource);
    if (additionalInfo.trim() !== '') {
      let infoCondition = JSON.parse(JSON.stringify(conditionTemplate));
      infoCondition.code.text = additionalInfo;
      infoCondition.recordedDate = new Date().toISOString().slice(0, 10);
      resources.push(infoCondition);
    }
    const result = {
      resources: resources,
      category: CATEGORY,
      source: SOURCE.url,
      sourceName: SOURCE.name
    }
    resourceDispatch('update-resources', result);
  }
</script>
<form on:submit|preventDefault={() => FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, SOURCE, prepareIps)}>
  <!-- <p class="text-secondary"><em>Select any identities, functional concerns, or needs you would like your carers to be aware of.</em></p> -->
  <h5>Functional Identities and Concerns</h5>
  <FormGroup>
    <Label class="text-secondary">I would like my care team to be aware of my concerns around:</Label>
    <Input type="checkbox" name="concern-visual" bind:checked={conditions.concern_visual.checked} label="Vision"/>
    <Input type="checkbox" name="concern-audio" bind:checked={conditions.concern_audio.checked} label="Hearing / Listening"/>
    <Input type="checkbox" name="concern-cognition" bind:checked={conditions.concern_cognition.checked} label="Cognition / thinking / understanding / information processing"/>
    <Input type="checkbox" name="concern-speaking" bind:checked={conditions.concern_speaking.checked} label="Speaking / communicating / Conversation / Verbal interactions"/>
    <Input type="checkbox" name="concern-mobility" bind:checked={conditions.concern_mobility.checked} label="Mobility / moving myself around"/>
    <Input type="checkbox" name="concern-gender" bind:checked={conditions.concern_gender.checked} label="Use of gender specific areas"/>
    <Input type="checkbox" name="concern-memory" bind:checked={conditions.concern_memory.checked} label="Memory"/>
    <Input type="checkbox" name="concern-trauma" bind:checked={conditions.concern_trauma.checked} label="Past Trauma"/>
    <Input type="checkbox" name="concern-focus" bind:checked={conditions.concern_focus.checked} label="Staying focused / Concentration"/>
    <Input type="checkbox" name="concern-addiction" bind:checked={conditions.concern_addiction.checked} label="Managing my addiction(s)"/>
    <Input type="checkbox" name="concern-city" bind:checked={conditions.concern_city.checked} label="I am from a small and/or remote community and cities and/or lots of people are an unfamiliar environment for me."/>
  </FormGroup>
  
  <h5>Functional Needs</h5>
  <FormGroup>
    <Label class="text-secondary">I may need help with:</Label>
    <Input type="checkbox" name="eating" bind:checked={conditions.eating.checked} label="Eating / Drinking"/>
    <Input type="checkbox" name="toileting" bind:checked={conditions.toileting.checked} label="Toileting"/>
    <Input type="checkbox" name="bed-exit" bind:checked={conditions.bed_exit.checked} label="Getting out of bed"/>
    <Input type="checkbox" name="bed-in" bind:checked={conditions.bed_in.checked} label="Moving in bed"/>
    <Input type="checkbox" name="orientation" bind:checked={conditions.orientation.checked} label="Getting orientated in a new environment"/>
    <Input type="checkbox" name="dressing" bind:checked={conditions.dressing.checked} label="Dressing"/>
    <Input type="checkbox" name="bathing" bind:checked={conditions.bathing.checked} label="Bathing / Cleaning"/>
    <Input type="checkbox" name="meds" bind:checked={conditions.meds.checked} label="Taking my medications"/>
    <Input type="checkbox" name="reading" bind:checked={conditions.reading.checked} label="Reading Documentation"/>
  </FormGroup>
  
  <h5>Functional Aids</h5>
  <FormGroup>
    <Label><b>I have:</b></Label>
    <Input type="checkbox" name="dog" bind:checked={conditions.dog.checked} label="A Guide Dog"/>
    <Input type="checkbox" name="wheelchair" bind:checked={conditions.wheelchair.checked} label="A Wheelchair"/>
    <Input type="checkbox" name="comm-device" bind:checked={conditions.comm_device.checked} label="A Communication Device"/>
  </FormGroup>

  <FormGroup>
    <Label>Anything else you want to say about your general care needs or anxieties, or to explain any of the boxes you ticked above:</Label>
    <Input type="textarea" bind:value={additionalInfo} rows="5" />
  </FormGroup>

  <Row>
    <Col xs="auto">
      <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
        {#if !processing}
          Update your care needs
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