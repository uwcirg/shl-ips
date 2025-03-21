<script lang="ts">
  import { Accordion, AccordionItem, Button, Col, FormGroup, Input, Row } from 'sveltestrap';
  import { createEventDispatcher } from 'svelte';
  import NIOAutoCoderInput from '$lib/components/app/NIOAutoCoderInput.svelte';
  import type { IOResponse, ResourceRetrieveEvent } from '$lib/utils/types';

  const resourceDispatch = createEventDispatcher<{ 'update-resources': ResourceRetrieveEvent }>();

  export let sectionKey: string = 'Occupational Data';

  let canShare = navigator?.canShare?.({ url: 'https://example.com', title: 'Title' }); // True for Chrome

  let employmentStatus: any | undefined;
  let currentJob: any | undefined;
  let pastJob: any | undefined;
  let retirementDate: any | undefined;
  let combatPeriod: any | undefined;

  let statuses: Record<string, string> = {
    Employed: 'Employed',
    Unemployed: 'Unemployed',
    'Not in labor force': 'NotInLaborForce'
  };

  // Defaults
  let working = true;
  let workingPast = false;
  let retired = false;
  let combat = false;
  let status = 'Employed';
  let jobCurrent: IOResponse;
  let industryCurrent: IOResponse;
  let startCurrent: string;
  let jobPast: IOResponse;
  let industryPast: IOResponse;
  let startPast: string;
  let endPast: string;
  let startRetirement: string;
  let startCombat: string;
  let endCombat: string;

  // Present job resource template
  let currentJobTemplate = {
    resource: {
      resourceType: 'Observation',
      id: '126e7704-b9dc-4559-ad88-138ad7a3f234',
      meta: {
        versionId: '10',
        lastUpdated: '2021-05-27T09:19:44.894+00:00',
        source: '#kx1P9fdzw85WYorA',
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
    },
    fullUrl: 'urn:uuid:126e7704-b9dc-4559-ad88-138ad7a3f234'
  };

  // Employment status resource template
  let employmentStatusTemplate = {
    resource: {
      resourceType: 'Observation',
      id: '126e7704-b9dc-4559-ad88-138ad7a3f235',
      meta: {
        versionId: '7',
        lastUpdated: '2021-05-26T17:22:34.756+00:00',
        source: '#H1Oz6Eja94PABzAs',
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
    },
    fullUrl: 'urn:uuid:126e7704-b9dc-4559-ad88-138ad7a3f235'
  };

  // Past job resource template
  let pastJobTemplate = {
    resource: {
      resourceType: 'Observation',
      id: '126e7704-b9dc-4559-ad88-138ad7a3f236',
      meta: {
        versionId: '10',
        lastUpdated: '2021-05-27T09:19:44.894+00:00',
        source: '#kx1P9fdzw85WYorA',
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
    },
    fullUrl: 'urn:uuid:126e7704-b9dc-4559-ad88-138ad7a3f236'
  };

  // Retirement date resource template
  let retirementDateTemplate = {
    resource: {
      resourceType: 'Observation',
      id: '126e7704-b9dc-4559-ad88-138ad7a3f237',
      meta: {
        versionId: '1',
        lastUpdated: '2021-05-26T02:20:50.364+00:00',
        source: '#xIztR2ILtakKFMdW',
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
      valueDateTime: '2021-05-30'
    },
    fullUrl: 'urn:uuid:126e7704-b9dc-4559-ad88-138ad7a3f237'
  };

  // Combat zone period resource template
  let combatPeriodTemplate = {
    resource: {
      resourceType: 'Observation',
      id: '126e7704-b9dc-4559-ad88-138ad7a3f238',
      meta: {
        versionId: '2',
        lastUpdated: '2021-05-26T02:30:21.329+00:00',
        source: '#RKwpT7ubUXgCKeEe',
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
        start: '2005-04-01',
        end: '2006-03-31'
      }
    },
    fullUrl: 'urn:uuid:126e7704-b9dc-4559-ad88-138ad7a3f238'
  };

  $: {
    if (working || jobCurrent || industryCurrent || startCurrent) {
      updateCurrentJob();
    }
    if (status) {
      updateEmploymentStatus();
      working = status === 'Employed';
    }
    if (workingPast || jobPast || industryPast || startPast || endPast) {
      updatePastJob();
    }

    if (retired || startRetirement) {
      updateRetirementDate();
    }

    if (combat || startCombat || endCombat) {
      updateCombatPeriod();
    }
  }

  function updateCurrentJob() {
    if (working) {
      if (currentJob === undefined) {
        currentJob = JSON.parse(JSON.stringify(currentJobTemplate));
      }
      if (startCurrent) {
        let period: any = { start: startCurrent };
        currentJob.resource.effectivePeriod = period;
      }
      if (jobCurrent) {
        currentJob.resource.valueCodeableConcept.coding = [{
          system: 'https://terminology.hl7.org/2.0.0/CodeSystem-PHOccupationCDCCensus2010.html',
          code: jobCurrent.Code,
          display: jobCurrent.Title
        }];
      }
      if (industryCurrent) {
        currentJob.resource.component[0].valueCodeableConcept.coding = [{
          system: 'https://terminology.hl7.org/2.0.0/CodeSystem-PHIndustryCDCCensus2010.html',
          code: industryCurrent.Code,
          display: industryCurrent.Title
        }];
      }
    } else {
      currentJob = undefined;
    }
  }

  function updatePastJob() {
    if (workingPast) {
      if (pastJob === undefined) {
        pastJob = JSON.parse(JSON.stringify(pastJobTemplate));
      }
      if (startPast || endPast) {
        let period: any = {};
        if (startPast) {
          period.start = startPast;
        }
        if (endPast) {
          period.end = endPast;
        }
        pastJob.resource.effectivePeriod = period;
      }
      if (jobPast) {
        pastJob.resource.valueCodeableConcept.coding = [{
          system: 'https://terminology.hl7.org/2.0.0/CodeSystem-PHOccupationCDCCensus2010.html',
          code: jobPast.Code,
          display: jobPast.Title
        }];
      }
      if (industryPast) {
        pastJob.resource.component[0].valueCodeableConcept.coding = [{
          system: 'https://terminology.hl7.org/2.0.0/CodeSystem-PHIndustryCDCCensus2010.html',
          code: industryPast.Code,
          display: industryPast.Title
        }];
      }
    } else {
      pastJob = undefined;
    }
  }

  function updateRetirementDate() {
    if (retired) {
      if (retirementDate === undefined) {
        retirementDate = JSON.parse(JSON.stringify(retirementDateTemplate));
      }
      if (startRetirement) {
        retirementDate.resource.valueDateTime = startRetirement;
      }
    } else {
      retirementDate = undefined;
    }
  }

  function updateCombatPeriod() {
    if (combat) {
      if (combatPeriod === undefined) {
        combatPeriod = JSON.parse(JSON.stringify(combatPeriodTemplate));
      }
      if (startCombat || endCombat) {
        let period: any = {};
        if (startCombat) {
          period.start = startCombat;
        }
        if (endCombat) {
          period.end = endCombat;
        }
        combatPeriod.resource.valuePeriod = period;
      }
    } else {
      combatPeriod = undefined;
    }
  }

  function updateEmploymentStatus() {
    if (employmentStatus === undefined) {
      employmentStatus = JSON.parse(JSON.stringify(employmentStatusTemplate));
    }
    employmentStatus.resource.valueCodeableConcept.coding[0].code = statuses[status];
    employmentStatus.resource.valueCodeableConcept.coding[0].display = status;
    if (currentJob && startCurrent) {
      employmentStatus.resource.effectivePeriod = {
        start: startCurrent
      };
    } else {
      delete employmentStatus.resource.effectivePeriod;
    }
  }

  let buttonText = 'Add occupation to summary';
  let buttonDisabled = false;
  function updateOdhSection() {
    buttonText = 'Added!';
    buttonDisabled = true;
    setTimeout(() => {
      buttonDisabled = false;
      buttonText = 'Add occupation to summary';
    }, 1000);
    if (employmentStatus || currentJob || pastJob || retirementDate || combatPeriod) {
      let odhSectionResources = [
        employmentStatus,
        currentJob,
        pastJob,
        retirementDate,
        combatPeriod
      ].filter((r) => r !== undefined);
      let result: ResourceRetrieveEvent = {
        resources: odhSectionResources.map((r) => r.resource),
        sectionKey: sectionKey
      };
      resourceDispatch('update-resources', result);
      console.log(odhSectionResources);
    }
  }
</script>

<Accordion stayOpen>
  <AccordionItem active class="odh-section" header="Current work">
    <Row>
      <Col xs="auto" class="mt-1">I am currently</Col>
      <Col xs="auto">
        <Input type="select" bind:value={status} style="max-width: 300px">
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
    {#if working}
      <br />
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">I work as a(n)</Col>
          <Col style="flex-grow: 1" xs="auto">
            <NIOAutoCoderInput bind:value={jobCurrent} mode="Occupation" />
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">My company's primary business activity is</Col>
          <Col style="flex-grow: 1" xs="auto">
            <NIOAutoCoderInput bind:value={industryCurrent} mode="Industry" />
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">I started this job</Col>
          <Col xs="auto">
            <Input type={canShare ? 'month' : 'date'} bind:value={startCurrent} />
          </Col>
        </Row>
      </FormGroup>
    {/if}
  </AccordionItem>
  <AccordionItem active class="odh-section" header="Past work">
    <Row class="mx-1">
      <Input
        type="switch"
        bind:checked={workingPast}
        label={`I ${workingPast ? 'do not ': ''}have a previous job`}
      />
    </Row>
    {#if workingPast}
      <br />
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">I used to work as a(n)</Col>
          <Col style="flex-grow: 1" xs="auto">
            <NIOAutoCoderInput bind:value={jobPast} mode="Occupation" />
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">My company's primary business activity was</Col>
          <Col style="flex-grow: 1" xs="auto">
            <NIOAutoCoderInput bind:value={industryPast} mode="Industry" />
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">I started this job</Col>
          <Col xs="auto">
            <Input type={canShare ? 'month' : 'date'} bind:value={startPast} />
          </Col>
          <Col xs="auto" class="mt-1">and stopped</Col>
          <Col xs="auto">
            <Input type={canShare ? 'month' : 'date'} bind:value={endPast} />
          </Col>
        </Row>
      </FormGroup>
    {/if}
  </AccordionItem>
  <AccordionItem active class="odh-section" header="Retirement date">
    <Row class="mx-1">
      <Input
        type="switch"
        bind:checked={retired}
        label={`I am ${retired ? '' : 'not '}retired`}
      />
    </Row>
    {#if retired}
      <br />
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">I retired {canShare ? 'in' : 'on'}</Col>
          <Col xs="auto">
            <Input type={canShare ? 'month' : 'date'} bind:value={startRetirement} />
          </Col>
        </Row>
      </FormGroup>
    {/if}
  </AccordionItem>
  <AccordionItem active class="odh-section" header="Combat zone work/hazardous duty">
    <Row class="mx-1">
      <Input
        type="switch"
        bind:checked={combat}
        label={`I have ${combat ? '' : 'not '}worked in a combat zone or other hazardous conditions`}
      />
    </Row>
    {#if combat}
      <br />
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">I started working in a combat zone or other hazardous conditions</Col>
          <Col xs="auto">
            <Input type={canShare ? 'month' : 'date'} bind:value={startCombat} />
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto" class="mt-1">and stopped</Col>
          <Col xs="auto">
            <Input type={canShare ? 'month' : 'date'} bind:value={endCombat} />
          </Col>
        </Row>
      </FormGroup>
    {/if}
  </AccordionItem>
</Accordion>
<br />
<Button color="primary" on:click={updateOdhSection} disabled={buttonDisabled}>
  {buttonText}
</Button>

<style>
  :global(.odh-section > .accordion-collapse.show) {
    overflow: visible !important;
  }
</style>
