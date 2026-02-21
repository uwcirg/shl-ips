<script lang="ts">
  import { Accordion, AccordionItem, Button, Col, FormGroup, Icon, Input, Row } from '@sveltestrap/sveltestrap';
  import { createEventDispatcher, onMount } from 'svelte';
  import NIOAutoCoderInput from '$lib/components/form/NIOAutoCoderInput.svelte';
  import type { IOResponse, ResourceRetrieveEvent } from '$lib/utils/types';
  import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';
  import { METHODS, CATEGORIES } from '$lib/config/tags';
  import type { IResourceCollection } from '$lib/utils/types';
  import { ResourceHelper } from '$lib/utils/ResourceHelper';
  import type { Observation } from 'fhir/r4';

  export let sectionKey: string = 'Occupational Data';
  export let formData: IResourceCollection | undefined;
  let resources;
  $: resources = formData?.resources;

  const resourceDispatch = createEventDispatcher<{ 'update-resources': ResourceRetrieveEvent }>();
  const CATEGORY = CATEGORIES.OCCUPATIONAL_DATA_FOR_HEALTH;
  const METHOD = METHODS.OCCUPATIONAL_DATA_FOR_HEALTH_FORM;
  const SOURCE = {
    url: window.location.origin,
    name: 'My Work Info'
  };
  let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;

  let supportsMonthInput = false;
  onMount(() => {
    if (formData) {
      initializeFieldsForFormData();
    } else {
      initializeDefaultFields();
    }
  });

  let statuses: Record<string, string> = {
    Employed: 'Employed',
    Unemployed: 'Unemployed',
    'Not in labor force': 'NotInLaborForce'
  };

  // Defaults
  let defaults = {
    status: 'Employed',
    isWorking: true,
    wasWorkingPast: false,
    isRetired: false,
    wasInCombat: false,
    currentWork: {
      jobCurrent: undefined as IOResponse | undefined,
      industryCurrent: undefined as IOResponse | undefined,
      startCurrent: ""
    },
    pastWork: {
      jobPast: undefined as IOResponse | undefined,
      industryPast: undefined as IOResponse | undefined,
      startPast: "",
      endPast: "",
    },
    retirementDate: {
      startRetirement: ""
    },
    combatPeriod: {
      startCombat: "",
      endCombat: ""
    }
  }

  let defaultValues = {
    status: defaults.status,
    isWorking: defaults.isWorking,
    wasWorkingPast: defaults.wasWorkingPast,
    isRetired: defaults.isRetired,
    wasInCombat: defaults.wasInCombat,
    currentWork: [defaults.currentWork],
    pastWork: [] as (typeof defaults.pastWork)[],
    retirementDates: [] as (typeof defaults.retirementDate)[],
    combatPeriods: [] as (typeof defaults.combatPeriod)[]
  };
  // Form values
  let values = copyOf(defaultValues);

  $: if ($resources) {
    initializeFieldsForFormData();
  }

  function getJobHistoryResources(rhs: ResourceHelper[]) {
    return rhs?.filter(rh => rh.resource.code?.coding?.find(c => c.code === '11341-5' && c.system === 'http://loinc.org')).map(r => r.resource);
  }

  function getCurrentJobResources(rhs: ResourceHelper[]) {
    const jhrs = getJobHistoryResources(rhs);
    return jhrs.filter(r => r.extension.find(e => e.url === 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension' && e.valueBoolean));
  }

  function getPastJobResources(rhs: ResourceHelper[]) {
    const jhrs = getJobHistoryResources(rhs);
    return jhrs.filter(r => r.extension.find(e => e.url === 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension' && !e.valueBoolean));
  }

  function getEmploymentStatusResource(rhs: ResourceHelper[]) {
    return rhs?.filter(rh => rh.resource.code?.coding?.find(c => c.code === '74165-2' && c.system === 'http://loinc.org')).map(r => r.resource).pop();
  }

  function getRetirementDateResources(rhs: ResourceHelper[]) {
    return rhs?.filter(r => r.resource.code?.coding?.find(c => c.code === '87510-4' && c.system === 'http://loinc.org')).map(r => r.resource);
  }
  
  function getCombatPeriodResources(rhs: ResourceHelper[]) {
    return rhs?.filter(r => r.resource.code?.coding?.find(c => c.code === '87511-2' && c.system === 'http://loinc.org')).map(r => r.resource);
  }

  function initializeCurrentJobFields(rhs: ResourceHelper[]) {
    const currentJobResources = getCurrentJobResources(rhs);
    if (currentJobResources.length === 0) { return; }
    values.isWorking = true;
    values.currentWork = [];
    for (const resource of currentJobResources) {
      const jobValues = {
        jobCurrent: {
          Code: resource.valueCodeableConcept.coding[0].code,
          Title: resource.valueCodeableConcept.coding[0].display,
          Score: 1
        },
        industryCurrent: {
          Code: resource.component[0].valueCodeableConcept.coding[0].code,
          Title: resource.component[0].valueCodeableConcept.coding[0].display,
          Score: 1
        },
        startCurrent: resource.effectivePeriod?.start,
      };
      values.currentWork.push(jobValues);
    }
  }

  function initializePastJobFields(rhs: ResourceHelper[]) {
    const pastJobResources = getPastJobResources(rhs);
    if (pastJobResources.length === 0) { return; }
    values.wasWorkingPast = true;
    values.pastWork = [];
    for (const resource of pastJobResources) {
      const jobValues = {
        jobPast: {
          Code: resource.valueCodeableConcept.coding[0].code,
          Title: resource.valueCodeableConcept.coding[0].display,
          Score: 1
        },
        industryPast: {
          Code: resource.component[0].valueCodeableConcept.coding[0].code,
          Title: resource.component[0].valueCodeableConcept.coding[0].display,
          Score: 1
        },
        startPast: resource.effectivePeriod.start,
        endPast: resource.effectivePeriod.end,
      };
      values.pastWork.push(jobValues);
    }
  }

  function initializeEmploymentStatusFields(rhs: ResourceHelper[]) {
    const employmentStatusResource = getEmploymentStatusResource(rhs);
    if (employmentStatusResource) {
      values.status = employmentStatusResource.valueCodeableConcept.coding[0].display ?? 'Employed';
    }
  }

  function initializeRetirementDateFields(rhs: ResourceHelper[]) {
    const retirementDateResources = getRetirementDateResources(rhs);
    values.retirementDates = [];
    for (const resource of retirementDateResources) {
      const retirementDate = {
        startRetirement: resource.valueDateTime ?? ""
      };
      values.retirementDates.push(retirementDate);
    }
  }

  function initializeCombatPeriodFields(rhs: ResourceHelper[]) {
    const combatPeriodResources = getCombatPeriodResources(rhs);
    values.combatPeriods = [];
    for (const resource of combatPeriodResources) {
      const combatPeriod = {
        startCombat: resource.valuePeriod.start ?? "",
        endCombat: resource.valuePeriod.env ?? "",
      };
      values.combatPeriods.push(combatPeriod)
    }
  }

  function initializeFieldsForFormData() {
    if (!$resources) { return; }

    const resources = Object.values($resources) as ResourceHelper[];
    if (!resources?.length) { return; }
    
    initializeCurrentJobFields(resources);
    initializePastJobFields(resources);
    initializeEmploymentStatusFields(resources);
    initializeRetirementDateFields(resources);
    initializeCombatPeriodFields(resources);
  }

  function resetEmploymentStatus() {
    values.isWorking = defaults.isWorking;


  }

  function copyOf(a: any) {
    return JSON.parse(JSON.stringify(a));
  }

  function initializeDefaultFields() {
    values = copyOf(defaultValues);
  }

  function addCurrentJob() {
    values.currentWork.push(copyOf(defaults.currentWork));
    values=values;
  }
  
  function addPastJob() {
    values.pastWork.push(copyOf(defaults.pastWork));
    values=values;
  }
  
  function addRetirementDate() {
    values.retirementDates.push(copyOf(defaults.retirementDate));
    values=values;
  }
  
  function addCombatPeriod() {
    values.combatPeriods.push(copyOf(defaults.combatPeriod));
    values=values;
  }

  function deleteCurrentJob(index: number) {
    values.currentWork.splice(index, 1);
    values=values;
  }
  
  function deletePastJob(index: number) {
    values.pastWork.splice(index, 1);
    values=values;
  }
  
  function deleteRetirementDate(index: number) {
    values.retirementDates.splice(index, 1);
    values=values;
  }
  
  function deleteCombatPeriod(index: number) {
    values.combatPeriods.splice(index, 1);
    values=values;
  }
  
  function clearWorkInfo() {
    initializeDefaultFields();
  }
  

  // Present job resource template
  let currentJobTemplate = {
    resourceType: 'Observation',
    id: '',
    meta: {
      profile: ['http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob']
    },
    extension: [
      {
        url: 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension',
        valueBoolean: true
      }
    ],
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'social-history'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '11341-5',
          display: 'History of Occupation'
        }
      ]
    },
    subject: {
      reference: 'Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299'
    },
    valueCodeableConcept: {
      coding: []
    },
    component: [
      {
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '86188-0',
              display: 'History of Occupation Industry'
            }
          ]
        },
        valueCodeableConcept: {
          coding: []
        }
      }
    ]
  };

  // Employment status resource template
  let employmentStatusTemplate = {
    resourceType: 'Observation',
    id: '',
    meta: {
      profile: ['http://hl7.org/fhir/us/odh/StructureDefinition/odh-EmploymentStatus']
    },
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'social-history'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '74165-2',
          display: 'History of employment status NIOSH'
        }
      ]
    },
    subject: {
      reference: 'Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299'
    },
    valueCodeableConcept: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue',
          code: 'Employed',
          display: 'Employed'
        }
      ]
    }
  };

  // Past job resource template
  let pastJobTemplate = {
    resourceType: 'Observation',
    id: '',
    meta: {
      profile: ['http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob']
    },
    extension: [
      {
        url: 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension',
        valueBoolean: false
      }
    ],
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'social-history'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '11341-5',
          display: 'History of Occupation'
        }
      ]
    },
    subject: {
      reference: 'Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299'
    },
    valueCodeableConcept: {
      coding: []
    },
    component: [
      {
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '86188-0',
              display: 'History of Occupation Industry'
            }
          ]
        },
        valueCodeableConcept: {
          coding: []
        }
      }
    ]
  };

  // Retirement date resource template
  let retirementDateTemplate = {
    resourceType: 'Observation',
    id: '126e7704-b9dc-4559-ad88-138ad7a3f237',
    meta: {
      profile: ['http://hl7.org/fhir/us/odh/StructureDefinition/odh-RetirementDate']
    },
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'social-history'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '87510-4',
          display: 'Date of Retirement'
        }
      ]
    },
    subject: {
      reference: 'Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299'
    },
    valueDateTime: ''
  };

  // Combat zone period resource template
  let combatPeriodTemplate = {
    resourceType: 'Observation',
    id: '',
    meta: {
      profile: ['http://hl7.org/fhir/us/odh/StructureDefinition/odh-CombatZonePeriod']
    },
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'social-history'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '87511-2',
          display: 'Combat zone AndOr hazardous duty work dates'
        }
      ]
    },
    subject: {
      reference: 'Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299'
    },
    valuePeriod: {
      start: '',
      end: ''
    }
  };

  $: {
    if (values.status) {
      values.isWorking = values.status === 'Employed';
    }
  }

  function generateCurrentJobResources(): Observation[] {
    const currentJobResources: Observation[] = [];
    for (const [i, jobValue] of values.currentWork.entries()) {
      const currentJobResource = JSON.parse(JSON.stringify(currentJobTemplate));
      currentJobResource.id = `odh-current-job-${i}`;
      if (jobValue.startCurrent) {
        let period: any = { start: jobValue.startCurrent };
        currentJobResource.effectivePeriod = period;
      }
      if (jobValue.jobCurrent) {
        currentJobResource.valueCodeableConcept.coding = [{
          system: 'https://terminology.hl7.org/2.0.0/CodeSystem-PHOccupationCDCCensus2010.html',
          code: jobValue.jobCurrent.Code,
          display: jobValue.jobCurrent.Title
        }];
      }
      if (jobValue.industryCurrent) {
        currentJobResource.component[0].valueCodeableConcept.coding = [{
          system: 'https://terminology.hl7.org/2.0.0/CodeSystem-PHIndustryCDCCensus2010.html',
          code: jobValue.industryCurrent.Code,
          display: jobValue.industryCurrent.Title
        }];
      }
      currentJobResources.push(currentJobResource);
    }
    return currentJobResources;
  }

  function generatePastJobResources(): Observation[] {
    const pastJobResources: Observation[] = [];
    for (const [i, jobValue] of values.pastWork.entries()) {
      const pastJobResource = JSON.parse(JSON.stringify(pastJobTemplate));
      pastJobResource.id = `odh-past-job-${i}`;
      if (jobValue.startPast || jobValue.endPast) {
        let period: any = {};
        if (jobValue.startPast) {
          period.start = jobValue.startPast;
        }
        if (jobValue.endPast) {
          period.end = jobValue.endPast;
        }
        pastJobResource.effectivePeriod = period;
      }
      if (jobValue.jobPast) {
        pastJobResource.valueCodeableConcept.coding = [{
          system: 'https://terminology.hl7.org/2.0.0/CodeSystem-PHOccupationCDCCensus2010.html',
          code: jobValue.jobPast.Code,
          display: jobValue.jobPast.Title
        }];
      }
      if (jobValue.industryPast) {
        pastJobResource.component[0].valueCodeableConcept.coding = [{
          system: 'https://terminology.hl7.org/2.0.0/CodeSystem-PHIndustryCDCCensus2010.html',
          code: jobValue.industryPast.Code,
          display: jobValue.industryPast.Title
        }];
      }
      pastJobResources.push(pastJobResource);
    }
    return pastJobResources;
  }

  function generateRetirementDateResources(): Observation[] {
    const retirementDateResources: Observation[] = [];
    for (const [i, retirementDate] of values.retirementDates.entries()) {
      const retirementDateResource = JSON.parse(JSON.stringify(retirementDateTemplate));
      retirementDateResource.id = `odh-retirement-date-${i}`;
      if (retirementDate.startRetirement) {
        retirementDateResource.valueDateTime = retirementDate.startRetirement;
      }
      retirementDateResources.push(retirementDateResource);
    }
    return retirementDateResources;
  }

  function generateCombatPeriodResources(): Observation[] {
    const combatPeriodResources: Observation[] = [];
    for (const [i, combatPeriod] of values.combatPeriods.entries()) {
      const combatPeriodResource = JSON.parse(JSON.stringify(combatPeriodTemplate));
      combatPeriodResource.id = `odh-combat-period-${i}`;
      if (combatPeriod.startCombat || combatPeriod.endCombat) {
        let period: any = {};
        if (combatPeriod.startCombat) {
          period.start = combatPeriod.startCombat;
        }
        if (combatPeriod.endCombat) {
          period.end = combatPeriod.endCombat;
        }
        combatPeriodResource.valuePeriod = period;
      }
      combatPeriodResources.push(combatPeriodResource);
    }
    return combatPeriodResources;
  }

  function generateEmploymentStatusResources(): Observation[] {
    const employmentStatusResource = JSON.parse(JSON.stringify(employmentStatusTemplate));
    employmentStatusResource.id = `odh-employment-status`;
    employmentStatusResource.valueCodeableConcept.coding[0].code = statuses[values.status];
    employmentStatusResource.valueCodeableConcept.coding[0].display = values.status;
    let minDate: string | null = null;
    for (const jobValue of values.currentWork) {
      if (minDate === null || minDate > jobValue.startCurrent) {
        minDate = jobValue.startCurrent;
      }
    }
    if (minDate) {
      employmentStatusResource.effectivePeriod = {
        start: minDate
      };
    } else {
      delete employmentStatusResource.effectivePeriod;
    }
    return [employmentStatusResource];
  }

  let buttonText = 'Update work info';
  let buttonDisabled = false;
  function updateOdhSection() {
    let prevButtonText = buttonText;
    buttonText = 'Added!';
    buttonDisabled = true;
    setTimeout(() => {
      buttonDisabled = false;
      buttonText = prevButtonText;
    }, 1000);
    const employmentStatusResources = generateEmploymentStatusResources();
    const currentJobResources = generateCurrentJobResources();
    const pastJobResources = generatePastJobResources();
    const retirementDateResources = generateRetirementDateResources();
    const combatPeriodResources = generateCombatPeriodResources();

    const resources = [
      ...employmentStatusResources,
      ...currentJobResources,
      ...pastJobResources,
      ...retirementDateResources,
      ...combatPeriodResources
    ]
    let result: ResourceRetrieveEvent = {
      resources,
      sectionKey: sectionKey,
      category: CATEGORY,
      method: METHOD,
      source: SOURCE.url,
      sourceName: SOURCE.name
    };
    resourceDispatch('update-resources', result);
  }
</script>

<Accordion stayOpen>
  <AccordionItem active class="odh-section" header="Current work">
    <Row>
      <Col xs="auto" class="mt-1">I am currently</Col>
      <Col xs="auto">
        <Input type="select" bind:value={values.status} style="max-width: 300px">
          {#each Object.keys(statuses) as stat}
            <option
              value={stat}
              style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
            >
              {stat}
            </option>
          {/each}
        </Input>
      </Col>
    </Row>
    {#if values.isWorking}
      <br>
      {#each values.currentWork as jobValue, index}
        <FormGroup>
          <Row class="mb-2">
            <Col xs="auto" class="mt-1">I work as a(n)</Col>
            <Col style="flex-grow: 1" xs="auto">
              <NIOAutoCoderInput bind:value={jobValue.jobCurrent} mode="Occupation" id={`current-occupation-${index}`} />
            </Col>
          </Row>
          <Row class="mb-2">
            <Col xs="auto" class="mt-1">My company's primary business activity is</Col>
            <Col style="flex-grow: 1" xs="auto">
              <NIOAutoCoderInput bind:value={jobValue.industryCurrent} mode="Industry" id={`current-industry-${index}`}/>
            </Col>
          </Row>
          <Row class="mb-4 pb-4 border-bottom">
            <Col xs="auto" class="mt-1">I started this job</Col>
            <Col xs="auto">
              <Input type={supportsMonthInput ? 'month' : 'date'} bind:value={jobValue.startCurrent} />
            </Col>
            <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
              <Button outline color="danger" on:click={() => deleteCurrentJob(index)}>Delete</Button>
            </Col>
          </Row>
        </FormGroup>
      {/each}
      <Row>
        <Col>
          <Button color="secondary" outline on:click={() => addCurrentJob()}><Icon name="plus"/> Add current employment</Button>
        </Col>
      </Row>
    {/if}
  </AccordionItem>
  <AccordionItem active class="odh-section" header="Past work">
    {#each values.pastWork as jobValue, index}
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">I used to work as a(n)</Col>
          <Col style="flex-grow: 1" xs="auto">
            <NIOAutoCoderInput bind:value={jobValue.jobPast} mode="Occupation" id={`past-occupation-${index}`}/>
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">My company's primary business activity was</Col>
          <Col style="flex-grow: 1" xs="auto">
            <NIOAutoCoderInput bind:value={jobValue.industryPast} mode="Industry" id={`past-industry-${index}`}/>
          </Col>
        </Row>
        <Row class="mb-4 pb-4 border-bottom">
          <Col xs="auto" class="mt-1">I started this job</Col>
          <Col xs="auto">
            <Input type={supportsMonthInput ? 'month' : 'date'} bind:value={jobValue.startPast} />
          </Col>
          <Col xs="auto" class="mt-1">and stopped</Col>
          <Col xs="auto">
            <Input type={supportsMonthInput ? 'month' : 'date'} bind:value={jobValue.endPast} />
          </Col>
          <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
            <Button outline color="danger" on:click={() => deletePastJob(index)}>Delete</Button>
          </Col>
        </Row>
      </FormGroup>
    {/each}
    <Row>
      <Col>
        <Button color="secondary" outline on:click={() => addPastJob()}><Icon name="plus"/> Add past employment</Button>
      </Col>
    </Row>
  </AccordionItem>
  <AccordionItem active class="odh-section" header="Retirement date">
    {#each values.retirementDates as retirementDate, index}
      <FormGroup>
        <Row class="mb-4 pb-4 border-bottom">
          <Col xs="auto" class="mt-1">I retired {supportsMonthInput ? 'in' : 'on'}</Col>
          <Col xs="auto">
            <Input type={supportsMonthInput ? 'month' : 'date'} bind:value={retirementDate.startRetirement} />
          </Col>
          <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
            <Button outline color="danger" on:click={() => deleteRetirementDate(index)}>Delete</Button>
          </Col>
        </Row>
      </FormGroup>
    {/each}
    <Row>
      <Col>
        <Button color="secondary" outline on:click={() => addRetirementDate()}><Icon name="plus"/> Add retirement date</Button>
      </Col>
    </Row>
  </AccordionItem>
  <AccordionItem active class="odh-section" header="Combat zone work/hazardous duty">
    {#each values.combatPeriods as combatPeriod, index}
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">I started working in a combat zone or other hazardous conditions</Col>
          <Col xs="auto">
            <Input type={supportsMonthInput ? 'month' : 'date'} bind:value={combatPeriod.startCombat} />
          </Col>
        </Row>
        <Row class="mb-4 pb-4 border-bottom">
          <Col xs="auto" class="mt-1">and stopped</Col>
          <Col xs="auto">
            <Input type={supportsMonthInput ? 'month' : 'date'} bind:value={combatPeriod.endCombat} />
          </Col>
          <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
            <Button outline color="danger" on:click={() => deleteCombatPeriod(index)}>Delete</Button>
          </Col>
        </Row>
      </FormGroup>
    {/each}
    <Row>
      <Col>
        <Button color="secondary" outline on:click={() => addCombatPeriod()}><Icon name="plus"/> Add combat period</Button>
      </Col>
    </Row>
  </AccordionItem>
</Accordion>
<br>
<Row class="justify-content-between align-content-center">
  <Col class="d-flex flex-grow-1">
    <Button color="primary" on:click={FHIRDataServiceCheckerInstance?.checkFHIRDataServiceBeforeFetch(CATEGORY, METHOD, SOURCE.url, updateOdhSection)} disabled={buttonDisabled}>
      {buttonText}
    </Button>
  </Col>
  <Col class="d-flex justify-content-end align-items-start">
    <Button color="danger" outline on:click={() => clearWorkInfo()}>
      Clear work info
    </Button>
  </Col>
</Row>
<FHIRDataServiceChecker bind:this={FHIRDataServiceCheckerInstance}/>

<style>
  :global(.odh-section > .accordion-collapse.show) {
    overflow: visible !important;
  }
</style>
