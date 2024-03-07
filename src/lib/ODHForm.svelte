<script lang="ts">
    import {
      Accordion,
      AccordionItem,
      Col,
      FormGroup,
      Input,
      Label,
      Row } from 'sveltestrap';
    
    export let odhSection: any | undefined;
    export let odhSectionResources: any[] | undefined;

    let canShare = navigator?.canShare?.({ url: 'https://example.com', title: 'Title' }); // True for Chrome

    let employmentStatus: any | undefined;
    let currentJob: any | undefined;
    let pastJob: any | undefined;
    let combatPeriod: any | undefined;

    let working = true;
    let workingPast = true;
    let combat = false;
    let jobs: Record<string,string> = {
        "Bartender [Bartender]": "2345",
        "Certified Nursing Assistant (CNA) [Nursing Assistants]": "31-1014.00.007136",
        "Medical Researcher [Medical Scientists, Except Epidemiologists]": "19-1042.00.026469",
        "Clothier [Retail Salespersons]": "41-2031.00.008618",
    };
    let industries: Record<string,string> = {
        "Alcoholic beverage drinking places [Drinking Places (Alcoholic Beverages)": "722410.000378",
        "Home nursing services": "621610.008495",
        "Academies, college or university [Colleges, Universities, and Professional Schools]": "611310.000015",
        "Clothing stores, family [Family Clothing Stores]": "6448140.003510",
    };
    let jobCurrent = "";
    let industryCurrent = "";
    let startCurrent = "";
    let jobPast = "";
    let industryPast = "";
    let startPast = "";
    let endPast = "";
    let startCombat = "";
    let endCombat = "";

    let odhSectionTemplate = {
        title: "History of Occupation",
        code: {
            coding: [
            {
                system: "http://loinc.org",
                code: "11341-5",
                display: "History of Occupation"
            }
            ]
        },
        entry: []
    };

    let currentJobTemplate = {
      resource: {
        resourceType: "Observation",
        id: "observation-odh-present-job-sample",
        meta: {
          versionId: "10",
          lastUpdated: "2021-05-27T09:19:44.894+00:00",
          source: "#kx1P9fdzw85WYorA",
          profile: [
            "http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob"
          ]
        },
        extension: [
          {
            url: "http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension",
            valueBoolean: false
          }
        ],
        status: "final",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "11341-5",
              display: "History of Occupation"
            }
          ]
        },
        subject: {
          reference: "Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299",
        },
        valueCodeableConcept: {
          coding: []
        },
        component: [
          {
            code: {
              coding: [
                {
                  system: "http://loinc.org",
                  code: "86188-0",
                  display: "History of Occupation Industry"
                }
              ]
            },
            valueCodeableConcept: {
              coding: []
            }
          }
        ]
      },
      fullUrl: "observation-odh-present-job-sample"
    }

    let employmentStatusTemplate = {
      resource: {
        resourceType: "Observation",
        id: "observation-odh-employment-status-sample",
        meta: {
          versionId: "7",
          lastUpdated: "2021-05-26T17:22:34.756+00:00",
          source: "#H1Oz6Eja94PABzAs",
          profile: [
            "http://hl7.org/fhir/us/odh/StructureDefinition/odh-EmploymentStatus"
          ]
        },
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/NarrativeLink",
            valueUri: "urn:uuid:126e7704-b9dc-4559-ad88-138ad7a3f233#HistoryOfOccupation-observation-odh-employment-status-sample"
          }
        ],
        status: "final",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "74165-2",
              display: "History of employment status NIOSH"
            }
          ]
        },
        subject: {
          reference: "Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299",
        },
        valueCodeableConcept: {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/v3-ObservationValue",
              code: "Employed",
              display: "Employed"
            }
          ]
        }
      },
      fullUrl: "observation-odh-employment-status-sample"
    };

    let pastJobTemplate = {
      resource: {
        resourceType: "Observation",
        id: "observation-odh-past-job-sample",
        meta: {
          versionId: "10",
          lastUpdated: "2021-05-27T09:19:44.894+00:00",
          source: "#kx1P9fdzw85WYorA",
          profile: [
            "http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob"
          ]
        },
        extension: [
          {
            url: "http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension",
            valueBoolean: false
          }
        ],
        status: "final",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "11341-5",
              display: "History of Occupation"
            }
          ]
        },
        subject: {
          reference: "Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299",
        },
        valueCodeableConcept: {
          coding: []
        },
        component: [
          {
            code: {
              coding: [
                {
                  system: "http://loinc.org",
                  code: "86188-0",
                  display: "History of Occupation Industry"
                }
              ]
            },
            valueCodeableConcept: {
              coding: []
            }
          }
        ]
      },
      fullUrl: "observation-odh-past-job-sample"
    }

    let combatPeriodTemplate = {
      resource: {
        resourceType: "Observation",
        id: "observation-odh-combat-zone-period-sample",
        meta: {
          versionId: "2",
          lastUpdated: "2021-05-26T02:30:21.329+00:00",
          source: "#RKwpT7ubUXgCKeEe",
          profile: [
            "http://hl7.org/fhir/us/odh/StructureDefinition/odh-CombatZonePeriod"
          ]
        },
        extension: [
          {
            url: "http://hl7.org/fhir/StructureDefinition/NarrativeLink",
            valueUri: "urn:uuid:126e7704-b9dc-4559-ad88-138ad7a3f233#HistoryOfOccupation-observation-odh-combat-zone-period-sample"
          }
        ],
        status: "final",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "87511-2",
              display: "Combat zone AndOr hazardous duty work dates"
            }
          ]
        },
        subject: {
          reference: "Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299",
        },
        valuePeriod: {
          start: "2005-04-01",
          end: "2006-03-31"
        }
      },
      fullUrl: "observation-odh-combat-zone-period-sample"
    };

    $: {
        if (working || jobCurrent || industryCurrent || startCurrent) {
            updateCurrentJob();
            updateEmploymentStatus();
        }

        if (workingPast || jobPast || industryPast || startPast || endPast) {
            updatePastJob();
        }

        if (combat || startCombat || endCombat) {
            updateCombatPeriod();
        }
        updateOdhSection();
    }

    function updateCurrentJob() {
        if (working) {
            if (currentJob === undefined) {
                currentJob = JSON.parse(JSON.stringify(currentJobTemplate));
            }
            if (startCurrent) {
                let period:any = { start: startCurrent};
                currentJob.resource.effectivePeriod = period;
            }
            if (jobCurrent) {
                currentJob.resource.valueCodeableConcept.coding[0] = {
                    system: "http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH",
                    code: jobs[jobCurrent],
                    display: jobCurrent
                };
            }
            if (industryCurrent) {
                currentJob.resource.component[0].valueCodeableConcept.coding[0] = {
                    system: "http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH",
                    code: industries[industryCurrent],
                    display: industryCurrent
                };
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
                let period:any = {};
                if (startPast) { period.start = startPast }
                if (endPast) { period.end = endPast }
                pastJob.resource.effectivePeriod = period;
            }
            if (jobPast) {
                pastJob.resource.valueCodeableConcept.coding[0] = {
                    system: "http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH",
                    code: jobs[jobPast],
                    display: jobPast
                };
            }
            if (industryPast) {
                pastJob.resource.component[0].valueCodeableConcept.coding[0] = {
                    system: "http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH",
                    code: industries[industryPast],
                    display: industryPast
                };
            }
        } else {
            pastJob = undefined;
        }
    }

    function updateCombatPeriod() {
        if (combat) {
            if (combatPeriod === undefined) {
                combatPeriod = JSON.parse(JSON.stringify(combatPeriodTemplate));
            }
            if (startCombat || endCombat) {
                let period:any = {};
                if (startCombat) { period.start = startCombat }
                if (endCombat) { period.end = endCombat }
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
        let status = working ? "Employed" : "Unemployed";
        employmentStatus.resource.valueCodeableConcept.coding[0].code = status;
        employmentStatus.resource.valueCodeableConcept.coding[0].display = status;
        if (currentJob && startCurrent) {
            employmentStatus.resource.effectivePeriod = {
                start: startCurrent
            };
        } else {
            delete employmentStatus.resource.effectivePeriod;
        }
    }

    function updateOdhSection() {
        if (employmentStatus || currentJob || pastJob || combatPeriod) {
            if (odhSection === undefined) {
                odhSection = JSON.parse(JSON.stringify(odhSectionTemplate));
            }
            odhSectionResources = [employmentStatus, currentJob, pastJob, combatPeriod].filter((r) => r !== undefined);
            odhSection.entry = odhSectionResources.map((r) => {
                let uri = r.fullUrl;
                return {
                    reference: `Observation/${uri}`
                };
            });
        } else {
            odhSection = undefined;
        }
    }
</script>

<h2>Add health-related occupational information</h2>
<Label>It may be helpful to include information about the work you do in your medical history</Label>
<Accordion stayOpen>
  <AccordionItem active header="Current work">
    <Row class="mx-1">
      <Input type="switch" bind:checked={working} label={working ? "I have a job" : "I do not have a job"} />
    </Row>
    {#if working}
      <br>
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto">My current job is</Col>
          <Col xs="auto">
            <Input type="select" bind:value={jobCurrent} style="width: 200px">
              {#each Object.keys(jobs) as job}
                <option style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                  {job}
                </option>
              {/each}
            </Input>
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto">Which is part of the</Col>
          <Col xs="auto">
            <Input type="select" bind:value={industryCurrent} style="width: 100px">
              {#each Object.keys(industries) as industry}
                <option style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                  {industry}
                </option>
              {/each}
            </Input>
          </Col>
          <Col xs="auto">industry.</Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto">I started this job on</Col>
          <Col xs="auto">
            <Input type={canShare ? "month" : "date"} bind:value={startCurrent} />
          </Col>
        </Row>
      </FormGroup>
    {/if}
  </AccordionItem>
  <AccordionItem active header="Past work">
    <Row class="mx-1">
      <Input type="switch" bind:checked={workingPast} label={workingPast ? "I have a previous job" : "I do not have a previous job"} />
    </Row>
    {#if workingPast}
      <br>
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto">My previous job is</Col>
          <Col xs="auto">
            <Input type="select" bind:value={jobPast} style="width: 100px">
              {#each Object.keys(jobs) as job}
                <option style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                  {job}
                </option>
              {/each}
            </Input>
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto">Which is part of the</Col>
          <Col xs="auto">
            <Input type="select" bind:value={industryPast} style="width: 100px">
              {#each Object.keys(industries) as industry}
                <option style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                  {industry}
                </option>
              {/each}
            </Input>
          </Col>
          <Col xs="auto">industry.</Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto">I started this job on</Col>
          <Col xs="auto">
            <Input type={canShare ? "month" : "date"} bind:value={startPast} />
          </Col>
          <Col xs="auto">and stopped on</Col>
          <Col xs="auto">
            <Input type={canShare ? "month" : "date"} bind:value={endPast} />
          </Col>
        </Row>
      </FormGroup>
    {/if}
  </AccordionItem>
  <AccordionItem active header="Combat zone work">
    <Row class="mx-1">
      <Input type="switch" bind:checked={combat} label={combat ? "I have worked in a combat zone" : "No combat zone work"}/>
    </Row>
    {#if combat}
      <br>
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto">I began working in a combat zone on</Col>
          <Col xs="auto">
            <Input type={canShare ? "month" : "date"} bind:value={startCombat} />
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto">and stopped on</Col>
          <Col xs="auto">
            <Input type={canShare ? "month" : "date"} bind:value={endCombat} />
          </Col>
        </Row>
      </FormGroup>
    {/if}
  </AccordionItem>
</Accordion>
  