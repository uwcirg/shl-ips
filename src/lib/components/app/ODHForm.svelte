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
      occupation: undefined as IOResponse | undefined,
      industry: undefined as IOResponse | undefined,
      start: ""
    },
    pastWork: {
      occupation: undefined as IOResponse | undefined,
      industry: undefined as IOResponse | undefined,
      start: "",
      end: "",
    },
    retirementDate: {
      start: ""
    },
    combatPeriod: {
      start: "",
      end: ""
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
      const jobValues = copyOf(defaults.currentWork);
      jobValues.occupation = resource.valueCodeableConcept?.coding[0]?.code ? 
        {
          Code: resource.valueCodeableConcept.coding[0].code,
          Title: resource.valueCodeableConcept?.coding[0]?.display ?? "Unknown Occupation",
          Score: 1
        } : undefined;
      jobValues.industry = resource.component[0].valueCodeableConcept?.coding[0]?.code ? 
        {
          Code: resource.component[0].valueCodeableConcept.coding[0].code,
          Title: resource.component[0].valueCodeableConcept?.coding[0]?.display ?? "Unknown Industry",
          Score: 1
        } : undefined;
      jobValues.start = resource.effectivePeriod?.start ?? "",
      values.currentWork.push(jobValues);
    }
  }

  function initializePastJobFields(rhs: ResourceHelper[]) {
    const pastJobResources = getPastJobResources(rhs);
    if (pastJobResources.length === 0) { return; }
    values.wasWorkingPast = true;
    values.pastWork = [];
    for (const resource of pastJobResources) {
      const jobValues = copyOf(defaults.currentWork);
      jobValues.occupation = resource.valueCodeableConcept?.coding[0]?.code ? 
        {
          Code: resource.valueCodeableConcept.coding[0].code,
          Title: resource.valueCodeableConcept?.coding[0]?.display ?? "Unknown Occupation",
          Score: 1
        } : undefined;
      jobValues.industry = resource.component[0].valueCodeableConcept?.coding[0]?.code ? 
        {
          Code: resource.component[0].valueCodeableConcept.coding[0].code,
          Title: resource.component[0].valueCodeableConcept?.coding[0]?.display ?? "Unknown Industry",
          Score: 1
        } : undefined;
      jobValues.start = resource.effectivePeriod?.start ?? "",
      jobValues.end = resource.effectivePeriod?.end ?? "",
      values.pastWork.push(jobValues);
    }
  }

  function initializeEmploymentStatusFields(rhs: ResourceHelper[]) {
    const employmentStatusResource = getEmploymentStatusResource(rhs);
    if (employmentStatusResource) {
      values.status = employmentStatusResource.valueCodeableConcept?.coding[0]?.display ?? 'Employed';
    }
  }

  function initializeRetirementDateFields(rhs: ResourceHelper[]) {
    const retirementDateResources = getRetirementDateResources(rhs);
    values.retirementDates = [];
    for (const resource of retirementDateResources) {
      const retirementDate = {
        start: resource.valueDateTime ?? ""
      };
      values.retirementDates.push(retirementDate);
    }
  }

  function initializeCombatPeriodFields(rhs: ResourceHelper[]) {
    const combatPeriodResources = getCombatPeriodResources(rhs);
    values.combatPeriods = [];
    for (const resource of combatPeriodResources) {
      const combatPeriod = {
        start: resource.valuePeriod?.start ?? "",
        end: resource.valuePeriod?.end ?? "",
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
  
  function resetWorkInfo() {
    if ($resources && Object.keys($resources).length > 0) {
      initializeFieldsForFormData();
    } else {
      initializeDefaultFields();
    }
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

  function sortObjectKeys(obj: any): any {
    return Object.keys(obj).sort().reduce((result: any, key: any) => {
      result[key] = obj[key];
      return result;
    }, {});
  }

  function deduplicateObjectList(arr: any[]): any[] {
    const seen = new Set();
    return arr.filter((item: any) => {
      const strItem = JSON.stringify(sortObjectKeys(item));
      const duplicate = seen.has(strItem);
      seen.add(strItem);
      return !duplicate;
    });
  }

  function generateCurrentJobResources(): Observation[] {
    const currentJobResources: Observation[] = [];
    if (!values.isWorking) { return currentJobResources; } // Don't add current job data if not working
    const uniqueJobs = deduplicateObjectList(values.currentWork);
    for (const [i, jobValue] of uniqueJobs.entries()) {
      const currentJobResource = JSON.parse(JSON.stringify(currentJobTemplate));
      currentJobResource.id = `odh-current-job-${i}`;
      if (jobValue.start) {
        let period: any = { start: jobValue.start };
        currentJobResource.effectivePeriod = period;
      }
      if (jobValue.occupation) {
        currentJobResource.valueCodeableConcept.coding = [{
          system: 'https://terminology.hl7.org/2.0.0/CodeSystem-PHOccupationCDCCensus2010.html',
          code: jobValue.occupation.Code,
          display: jobValue.occupation.Title
        }];
      }
      if (jobValue.industry) {
        currentJobResource.component[0].valueCodeableConcept.coding = [{
          system: 'https://terminology.hl7.org/2.0.0/CodeSystem-PHIndustryCDCCensus2010.html',
          code: jobValue.industry.Code,
          display: jobValue.industry.Title
        }];
      }
      currentJobResources.push(currentJobResource);
    }
    return currentJobResources;
  }

  function generatePastJobResources(): Observation[] {
    const pastJobResources: Observation[] = [];
    const uniqueJobs = deduplicateObjectList(values.pastWork);
    for (const [i, jobValue] of uniqueJobs.entries()) {
      const pastJobResource = JSON.parse(JSON.stringify(pastJobTemplate));
      pastJobResource.id = `odh-past-job-${i}`;
      if (jobValue.start || jobValue.end) {
        let period: any = {};
        if (jobValue.start) {
          period.start = jobValue.start;
        }
        if (jobValue.end) {
          period.end = jobValue.end;
        }
        pastJobResource.effectivePeriod = period;
      }
      if (jobValue.occupation) {
        pastJobResource.valueCodeableConcept.coding = [{
          system: 'https://terminology.hl7.org/2.0.0/CodeSystem-PHOccupationCDCCensus2010.html',
          code: jobValue.occupation.Code,
          display: jobValue.occupation.Title
        }];
      }
      if (jobValue.industry) {
        pastJobResource.component[0].valueCodeableConcept.coding = [{
          system: 'https://terminology.hl7.org/2.0.0/CodeSystem-PHIndustryCDCCensus2010.html',
          code: jobValue.industry.Code,
          display: jobValue.industry.Title
        }];
      }
      pastJobResources.push(pastJobResource);
    }
    return pastJobResources;
  }

  function generateRetirementDateResources(): Observation[] {
    const retirementDateResources: Observation[] = [];
    const uniqueRetirementDates = deduplicateObjectList(values.retirementDates);
    const validRetirementDates = uniqueRetirementDates.filter((retirementDate: any) => retirementDate.start);
    for (const [i, retirementDate] of validRetirementDates.entries()) {
      const retirementDateResource = JSON.parse(JSON.stringify(retirementDateTemplate));
      retirementDateResource.id = `odh-retirement-date-${i}`;
      if (retirementDate.start) {
        retirementDateResource.valueDateTime = retirementDate.start;
      }
      retirementDateResources.push(retirementDateResource);
    }
    return retirementDateResources;
  }

  function generateCombatPeriodResources(): Observation[] {
    const combatPeriodResources: Observation[] = [];
    const uniqueCombatPeriods = deduplicateObjectList(values.combatPeriods);
    const validCombatPeriods = uniqueCombatPeriods.filter((combatPeriod: any) => combatPeriod.start || combatPeriod.end);
    for (const [i, combatPeriod] of validCombatPeriods.entries()) {
      const combatPeriodResource = JSON.parse(JSON.stringify(combatPeriodTemplate));
      combatPeriodResource.id = `odh-combat-period-${i}`;
      if (combatPeriod.start || combatPeriod.end) {
        let period: any = {};
        if (combatPeriod.start) {
          period.start = combatPeriod.start;
        }
        if (combatPeriod.end) {
          period.end = combatPeriod.end;
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
      if (minDate === null || minDate > jobValue.start) {
        minDate = jobValue.start;
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

  let buttonText = 'Save work info';
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
              <NIOAutoCoderInput bind:value={jobValue.occupation} mode="Occupation" id={`current-occupation-${index}`} />
            </Col>
          </Row>
          <Row class="mb-2">
            <Col xs="auto" class="mt-1">My company's primary business activity is</Col>
            <Col style="flex-grow: 1" xs="auto">
              <NIOAutoCoderInput bind:value={jobValue.industry} mode="Industry" id={`current-industry-${index}`}/>
            </Col>
          </Row>
          <Row class="mb-4 pb-4 border-bottom">
            <Col xs="auto" class="mt-1">I started this job</Col>
            <Col xs="auto">
              <Input type={supportsMonthInput ? 'month' : 'date'} bind:value={jobValue.start} />
            </Col>
            <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
              <Button outline color="danger" on:click={() => deleteCurrentJob(index)}>Delete</Button>
            </Col>
          </Row>
        </FormGroup>
      {/each}
      <Row>
        <Col>
          <Button color="secondary" outline on:click={() => addCurrentJob()}><Icon name="plus"/> Add { values.currentWork.length > 0 ? "another" : "a"} current job</Button>
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
            <NIOAutoCoderInput bind:value={jobValue.occupation} mode="Occupation" id={`past-occupation-${index}`}/>
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">My company's primary business activity was</Col>
          <Col style="flex-grow: 1" xs="auto">
            <NIOAutoCoderInput bind:value={jobValue.industry} mode="Industry" id={`past-industry-${index}`}/>
          </Col>
        </Row>
        <Row class="mb-4 pb-4 border-bottom">
          <Col xs="auto" class="mt-1">I started this job</Col>
          <Col xs="auto">
            <Input type={supportsMonthInput ? 'month' : 'date'} bind:value={jobValue.start} />
          </Col>
          <Col xs="auto" class="mt-1">and stopped</Col>
          <Col xs="auto">
            <Input type={supportsMonthInput ? 'month' : 'date'} bind:value={jobValue.end} />
          </Col>
          <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
            <Button outline color="danger" on:click={() => deletePastJob(index)}>Delete</Button>
          </Col>
        </Row>
      </FormGroup>
    {/each}
    <Row>
      <Col>
        <Button color="secondary" outline on:click={() => addPastJob()}><Icon name="plus"/> Add { values.pastWork.length > 0 ? "another" : "a"} past job</Button>
      </Col>
    </Row>
  </AccordionItem>
  <AccordionItem active class="odh-section" header="Retirement date">
    {#each values.retirementDates as retirementDate, index}
      <FormGroup>
        <Row class="mb-4 pb-4 border-bottom">
          <Col xs="auto" class="mt-1">I retired {supportsMonthInput ? 'in' : 'on'}</Col>
          <Col xs="auto">
            <Input type={supportsMonthInput ? 'month' : 'date'} bind:value={retirementDate.start} />
          </Col>
          <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
            <Button outline color="danger" on:click={() => deleteRetirementDate(index)}>Delete</Button>
          </Col>
        </Row>
      </FormGroup>
    {/each}
    <Row>
      <Col>
        <Button color="secondary" outline on:click={() => addRetirementDate()}><Icon name="plus"/> Add { values.retirementDates.length > 0 ? "another" : "a"} retirement date</Button>
      </Col>
    </Row>
  </AccordionItem>
  <AccordionItem active class="odh-section" header="Combat zone work/hazardous duty">
    {#each values.combatPeriods as combatPeriod, index}
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">I started working in a combat zone or other hazardous conditions</Col>
          <Col xs="auto">
            <Input type={supportsMonthInput ? 'month' : 'date'} bind:value={combatPeriod.start} />
          </Col>
        </Row>
        <Row class="mb-4 pb-4 border-bottom">
          <Col xs="auto" class="mt-1">and stopped</Col>
          <Col xs="auto">
            <Input type={supportsMonthInput ? 'month' : 'date'} bind:value={combatPeriod.end} />
          </Col>
          <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
            <Button outline color="danger" on:click={() => deleteCombatPeriod(index)}>Delete</Button>
          </Col>
        </Row>
      </FormGroup>
    {/each}
    <Row>
      <Col>
        <Button color="secondary" outline on:click={() => addCombatPeriod()}>
          <Icon name="plus"/> Add { values.combatPeriods.length > 0 ? "another" : "a"} combat period
        </Button>
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
    <Button color="danger" outline on:click={() => resetWorkInfo()}>
      Clear changes
    </Button>
  </Col>
</Row>
<FHIRDataServiceChecker bind:this={FHIRDataServiceCheckerInstance}/>

<style>
  :global(.odh-section > .accordion-collapse.show) {
    overflow: visible !important;
  }
</style>
