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
  import type { ResourceRetrieveEvent } from '$lib/utils/types';
  import type { CodeableConcept, Condition } from 'fhir/r4';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';
  import { METHODS, CATEGORIES } from '$lib/config/tags';

  export let disabled = false;

  const CATEGORY = CATEGORIES.PATIENT_STORY;
  const METHOD = METHODS.PATIENT_BODY_CONCERNS_FORM;
  const SOURCE = {
    url: window.location.origin,
    name: 'My Body'
  };
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;

  let processing = false;
  let fetchError = '';

  interface BodyConcernEntry {
    bodyPart: string;
    side: string;
    concern: string
  }
  let bodyPartConcerns: Array<BodyConcernEntry> = [
    {bodyPart: '', side: '', concern: ''}
  ];

  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  let bodyPartOptions: Record<string, Record<string, CodeableConcept>> = {
    "": {},
    "Arm": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "69273007",
        display: "Both Arms"
      },
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "368208006",
        display: "Left Arm"
      },
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "368209003",
        display: "Right Arm"
      }
    },
    "Hand": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "12861001",
        display: "Both Hands"
      },
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "85151006",
        display: "Left Hand"
      },
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "78791008",
        display: "Right Hand"
      }
    },
    "Fingers": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "362779006",
        display: "All Fingers"
      },
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "786841006",
        display: "Left Fingers"
      },
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "786842004",
        display: "Right Fingers"
      }
    },
    "Leg": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "40927001",
        display: "Both Legs"
      },
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "48979004",
        display: "Left Leg"
      },
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "32696007",
        display: "Right Leg"
      }
    },
    "Foot": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "8580001",
        display: "Both Feet"
      },
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "22335008",
        display: "Left Foot"
      },
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "7769000",
        display: "Right Foot"
      }
    },
    "Toes": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "8671006",
        display: "All Toes"
      },
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "785708006",
        display: "Left Toes"
      },
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "785709003",
        display: "Right Toes"
      }
    },
    "Hip": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "29836001",
        display: "Both Hips"
      },
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "287679003",
        display: "Left Hip"
      },
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "287579007",
        display: "Right Hip"
      }
    },
    "Eye": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "40638003",
        display: "Both Eyes"
      },
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "726675003",
        display: "Left Eye"
      },
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "726680007",
        display: "Right Eye"
      }
    },
    "Hypothalamus": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "67923007",
        display: "Hypothalamus"
      }
    },
    "Pituitary": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "181125003",
        display: "Pituitary"
      }
    },
    "Tongue": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "32709003",
        display: "Tongue"
      }
    },
    "Jaw": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "661005",
        display: "Jaw"
      }
    },
    "Oesophagus": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "32849002",
        display: "Oesophagus"
      }
    },
    "Large Colon": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "71854001",
        display: "Large Colon"
      }
    },
    "Stomach": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "69695003",
        display: "Stomach"
      }
    },
    "Gall Bladder": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "28231008",
        display: "Gall Bladder"
      }
    },
    "Kidney": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "17373004",
        display: "Both Kidneys"
      } ,
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "18639004",
        display: "Left Kidney"
      } ,
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "9846003",
        display: "Right Kidney"
      }
    },
    "Liver": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "10200004",
        display: "Liver"
      }
    },
    "Bladder": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "89837001",
        display: "Bladder"
      }
    },
    "Lung": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "74101002",
        display: "Both Lungs"
      },
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "44029006",
        display: "Left Lung"
      },
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "3341006",
        display: "Right Lung"
      }
    },
    "Breast": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "63762007",
        display: "Both Breasts"
      },
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "80248007",
        display: "Left Breast"
      } ,
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "73056007",
        display: "Right Breast"
      }
    },
    "Ovary": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "83238006",
        display: "Both Ovaries"
      },
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "43981004",
        display: "Left Ovary"
      } ,
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "20837000",
        display: "Right Ovary"
      }
    },
    "Uterus": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "35039007",
        display: "Uterus"
      }
    },
    "Cervix": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "71252005",
        display: "Cervix"
      }
    },
    "Vagina": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "76784001",
        display: "Vagina"
      }
    },
    "Penis": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "18911002",
        display: "Penis"
      }
    },
    "Prostate": {
      "": {
        system: "https://www.snomed.info/sct",
        code: "41216001",
        display: "Prostate"
      }
    },
    "Testicle": {
      "Both": {
        system: "https://www.snomed.info/sct",
        code: "181431007",
        display: "Both Testis"
      },
      "Left": {
        system: "https://www.snomed.info/sct",
        code: "367720001",
        display: "Left Testicle"
      },
      "Right": {
        system: "https://www.snomed.info/sct",
        code: "367719007",
        display: "Right Testicle"
      }
    }
  };

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
    category: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-category",
          code: "problem-list-item",
        }
      ]
    },
    bodySite: {
      coding: []
    },
    subject: {
      reference: "Patient/pat1"
    },
    recordedDate: "",
    code: {
      text: ""
    }
  };

  function prepareConditionResource(entry: BodyConcernEntry) {
    if (entry.bodyPart === '' && entry.concern === '') return;
    let currentCondition = JSON.parse(JSON.stringify(conditionTemplate));
    currentCondition.code.text = entry.concern;
    currentCondition.bodySite.coding.push(bodyPartOptions[entry.bodyPart][entry.side]);
    currentCondition.recordedDate = new Date().toISOString().slice(0, 10);;
    return currentCondition;
  }

  function prepareIps() {
    const resources = bodyPartConcerns.map(prepareConditionResource).filter((entry) => entry !== undefined);
    const result = {
      resources: resources,
      category: CATEGORY,
      method: METHOD,
      source: SOURCE.url,
      sourceName: SOURCE.name
    };
    resourceDispatch('update-resources', result);
  }

  function addStatus() {
    bodyPartConcerns = [...bodyPartConcerns, {bodyPart: '', side: '', concern: ''}];
  }

  function removeBodyPart(i: number) {
    bodyPartConcerns.splice(i, 1);
    bodyPartConcerns = bodyPartConcerns;
    if (bodyPartConcerns.length == 0) {
      addStatus();
    }
  }
</script>

<form on:submit|preventDefault={() => {}}>
  <h5>Body Concerns</h5>
  {#each bodyPartConcerns as status, i}
    <Row>
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Body Part">
          <Input type="select" bind:value={status.bodyPart}>
            {#each Object.keys(bodyPartOptions) as bodyPart}
              <option>{bodyPart}</option>
            {/each}
          </Input>
        </FormGroup>
      </Col>
      <Col xs="auto">
        <FormGroup style="font-size:small" class="text-secondary" label="Side">
          <Input type="select" disabled={Object.keys(bodyPartOptions[status.bodyPart]).length < 2} bind:value={status.side} style="width:100px">
            {#if Object.keys(bodyPartOptions[status.bodyPart]).length === 0}
              <option disabled></option>
              <option disabled>Both</option>
              <option disabled>Left</option>
              <option disabled>Right</option>
            {:else}
              {#each Object.keys(bodyPartOptions[status.bodyPart]) as side}
                <option>{side}</option>
              {/each}
            {/if}
          </Input>
        </FormGroup>
      </Col>
      <Col>
        <FormGroup style="font-size:small" class="text-secondary" label="What is the concern?">
          <!-- <Input type="select" bind:value={status.status} style="width: 165px">
            {#each statusOptions as option}
              <option>{option}</option>
            {/each}
          </Input> -->
          <Input type="text" bind:value={status.concern}/>
        </FormGroup>
      </Col>
      <Col xs="auto">
        <Button color="danger" outline on:click={() => removeBodyPart(i)}>
          {#if bodyPartConcerns.length > 1}
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
      <Button
        color="primary"
        style="width:fit-content"
        disabled={processing || disabled}
        on:click={FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, METHOD, SOURCE.url, prepareIps)}>
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
    {#if disabled}
      <Col xs="auto" class="d-flex align-items-center px-0">
        Please wait...
      </Col>
    {/if}
  </Row>
</form>
<FHIRDataServiceChecker bind:this={FHIRDataServiceCheckerInstance}/>
<span class="text-danger">{fetchError}</span>
