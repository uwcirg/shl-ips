<script lang="ts">
    import {
      Accordion,
      AccordionItem,
      Button,
      Col,
      FormGroup,
      Input,
      Row } from 'sveltestrap';
    
    export let odhSection: any | undefined;
    export let odhSectionResources: any[] | undefined;

    let canShare = navigator?.canShare?.({ url: 'https://example.com', title: 'Title' }); // True for Chrome

    let employmentStatus: any | undefined;
    let currentJob: any | undefined;
    let pastJob: any | undefined;
    let retirementDate: any | undefined;
    let combatPeriod: any | undefined;

    let statuses: Record<string, string> = {
      "Employed": "Employed",
      "Unemployed": "Unemployed",
      "Not in labor force": "NotInLaborForce"
    }
    let jobs: Record<string,any> = {
      "Bartender [Bartender]": [{
        display: "Bartender [Bartender]",
        code: "2345",
        system: "http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH.html"
      }],
      "Certified Nursing Assistant (CNA) [Nursing Assistants]": [{
        display: "Certified Nursing Assistant (CNA) [Nursing Assistants]",
        code: "31-1014.00.007136",
        system: "http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH.html"
      }, {
        system: "https://terminology.hl7.org/2.0.0/CodeSystem-PHIndustryCDCCensus2010.html",
        code: "8270",
        display: "Nursing care facilities"
      }],
      "Medical Researcher [Medical Scientists, Except Epidemiologists]": [{
        display: "Medical Researcher [Medical Scientists, Except Epidemiologists]",
        code: "19-1042.00.026469",
        system: "http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH.html"
      }, {
        system: "https://terminology.hl7.org/2.0.0/CodeSystem-PHOccupationCDCCensus2010.html",
        code: "1650",
        display: "Medical scientists"
      }],
      "Clothier [Retail Salespersons]": [{
        display: "Clothier [Retail Salespersons]",
        code: "41-2031.00.008618",
        system: "http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH.html"
      }]
    };
    let industries: Record<string,any> = {
      "Alcoholic beverage drinking places [Drinking Places (Alcoholic Beverages)]": [{
        display: "Alcoholic beverage drinking places [Drinking Places (Alcoholic Beverages)]",
        code: "722410.000378",
        system: "http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH.html"
      }],
      "Home nursing services": [{
        display: "Home nursing services",
        code: "621610.008495",
        system: "http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH.html"
      }, {
        system: "https://terminology.hl7.org/2.0.0/CodeSystem-PHOccupationCDCCensus2010.html",
        code: "3600",
        display: "Nursing, psychiatric, and home health aides"
      }],
      "Academies, college or university [Colleges, Universities, and Professional Schools]": [{
        display: "Academies, college or university [Colleges, Universities, and Professional Schools]",
        code: "611310.000015",
        system: "http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH.html"
      }, {
        system: "https://terminology.hl7.org/2.0.0/CodeSystem-PHOccupationCDCCensus2010.html",
        code: "7460",
        display: "Scientific research and development services"
      }],
      "Clothing stores, family [Family Clothing Stores]": [{
        display: "Clothing stores, family [Family Clothing Stores]",
        code: "6448140.003510",
        system: "http://terminology.hl7.org/CodeSystem/PHOccupationalDataForHealthODH.html"
      }]
    };

    // Defaults
    let working = true;
    let workingPast = true;
    let retired = false;
    let combat = false;
    let status = "Employed";
    let jobCurrent = "Medical Researcher [Medical Scientists, Except Epidemiologists]";
    let industryCurrent = "Academies, college or university [Colleges, Universities, and Professional Schools]";
    let startCurrent = canShare ? "2021-09" : "2021-09-07";
    let jobPast = "Certified Nursing Assistant (CNA) [Nursing Assistants]";
    let industryPast = "Home nursing services";
    let startPast = canShare ? "2016-05" : "2016-05-05";
    let endPast = canShare ? "2020-04" : "2020-04-15";
    let startRetirement = canShare ? "2024-03" : "2024-03-01";
    let startCombat = canShare ? "2016-08" : "2016-08-01";
    let endCombat = canShare ? "2017-01" : "2017-01-01";

    // Top-level ODH section template
    let odhSectionTemplate = {
      title: "Social History",
      code: {
        "coding" : [{
          "system" : "http://loinc.org",
          "code" : "29762-2",
          "display": "Social history Narrative"
        }]
      },
      entry: []
    };

    // Present job resource template
    let currentJobTemplate = {
      resource: {
        resourceType: "Observation",
        id: "126e7704-b9dc-4559-ad88-138ad7a3f234",
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
      fullUrl: "urn:uuid:126e7704-b9dc-4559-ad88-138ad7a3f234"
    }

    // Employment status resource template
    let employmentStatusTemplate = {
      resource: {
        resourceType: "Observation",
        id: "126e7704-b9dc-4559-ad88-138ad7a3f235",
        meta: {
          versionId: "7",
          lastUpdated: "2021-05-26T17:22:34.756+00:00",
          source: "#H1Oz6Eja94PABzAs",
          profile: [
            "http://hl7.org/fhir/us/odh/StructureDefinition/odh-EmploymentStatus"
          ]
        },
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
      fullUrl: "urn:uuid:126e7704-b9dc-4559-ad88-138ad7a3f235"
    };

    // Past job resource template
    let pastJobTemplate = {
      resource: {
        resourceType: "Observation",
        id: "126e7704-b9dc-4559-ad88-138ad7a3f236",
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
      fullUrl: "urn:uuid:126e7704-b9dc-4559-ad88-138ad7a3f236"
    }

    // Retirement date resource template
    let retirementDateTemplate = {
      resource: {
        resourceType: "Observation",
        id: "126e7704-b9dc-4559-ad88-138ad7a3f237",
        meta: {
          versionId: "1",
          lastUpdated: "2021-05-26T02:20:50.364+00:00",
          source: "#xIztR2ILtakKFMdW",
          profile: [
            "http://hl7.org/fhir/us/odh/StructureDefinition/odh-RetirementDate"
          ]
        },
        status: "final",
        code: {
          coding: [
            {
              system: "http://loinc.org",
              code: "87510-4",
              display: "Date of Retirement"
            }
          ]
        },
        subject: {
          reference: "Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299",
        },
        valueDateTime: "2021-05-30"
      },
      fullUrl: "urn:uuid:126e7704-b9dc-4559-ad88-138ad7a3f237"
    };

    // Combat zone period resource template
    let combatPeriodTemplate = {
      resource: {
        resourceType: "Observation",
        id: "126e7704-b9dc-4559-ad88-138ad7a3f238",
        meta: {
          versionId: "2",
          lastUpdated: "2021-05-26T02:30:21.329+00:00",
          source: "#RKwpT7ubUXgCKeEe",
          profile: [
            "http://hl7.org/fhir/us/odh/StructureDefinition/odh-CombatZonePeriod"
          ]
        },
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
      fullUrl: "urn:uuid:126e7704-b9dc-4559-ad88-138ad7a3f238"
    };

    $: {
        if (working || jobCurrent || industryCurrent || startCurrent) {
            updateCurrentJob();
        }
        if (status) {
          updateEmploymentStatus();
          working = (status === "Employed");
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
                let period:any = { start: startCurrent};
                currentJob.resource.effectivePeriod = period;
            }
            if (jobCurrent) {
                currentJob.resource.valueCodeableConcept.coding = jobs[jobCurrent];
            }
            if (industryCurrent) {
                currentJob.resource.component[0].valueCodeableConcept.coding = industries[industryCurrent];
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
                pastJob.resource.valueCodeableConcept.coding = jobs[jobPast];
            }
            if (industryPast) {
                pastJob.resource.component[0].valueCodeableConcept.coding = industries[industryPast];
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

    let buttonText = "Add occupation to summary";
    let buttonDisabled = false;
    function updateOdhSection() {
        buttonText = "Added!";
        buttonDisabled = true;
        setTimeout(() => {
          buttonText = odhSection ? "Update occupation" : "Add occupation to Summary";
          buttonDisabled = false;
        }, 1000);
        if (employmentStatus || currentJob || pastJob || retirementDate || combatPeriod) {
            if (odhSection === undefined) {
                odhSection = JSON.parse(JSON.stringify(odhSectionTemplate));
            }
            odhSectionResources = [employmentStatus, currentJob, pastJob, retirementDate, combatPeriod].filter((r) => r !== undefined);
            odhSection.entry = odhSectionResources.map((r) => {
                let uri = r.fullUrl;
                return {
                    reference: `${uri}`
                };
            });
        } else {
            odhSection = undefined;
        }
        console.log(odhSectionResources);
    }
</script>

<Accordion stayOpen>
  <AccordionItem active header="Current work">
    <Row>
      <Col xs="auto">I am currently</Col>
      <Col xs="auto">
        <Input type="select" bind:value={status} style="max-width: 300px">
          {#each Object.keys(statuses) as stat}
            <option value={stat} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              {stat}
            </option>
          {/each}
        </Input>
      </Col>
    </Row>
    {#if working}
      <br>
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto">I work as a(n)</Col>
          <Col xs="auto">
            <Input type="select" bind:value={jobCurrent} style="max-width: 300px">
              {#each Object.keys(jobs) as job}
                <option value={job} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                  {job}
                </option>
              {/each}
            </Input>
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto">My company's primary business activity is</Col>
          <Col xs="auto">
            <Input type="select" bind:value={industryCurrent} style="max-width: 300px">
              {#each Object.keys(industries) as industry}
                <option value={industry} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                  {industry}
                </option>
              {/each}
            </Input>
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto">I started this job</Col>
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
          <Col xs="auto">I used to work as a(n)</Col>
          <Col xs="auto">
            <Input type="select" bind:value={jobPast} style="max-width: 300px">
              {#each Object.keys(jobs) as job}
                <option value={job} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                  {job}
                </option>
              {/each}
            </Input>
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto">My company's primary business activity was</Col>
          <Col xs="auto">
            <Input type="select" bind:value={industryPast} style="max-width: 300px">
              {#each Object.keys(industries) as industry}
                <option value={industry} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                  {industry}
                </option>
              {/each}
            </Input>
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto">I started this job</Col>
          <Col xs="auto">
            <Input type={canShare ? "month" : "date"} bind:value={startPast} />
          </Col>
          <Col xs="auto">and stopped</Col>
          <Col xs="auto">
            <Input type={canShare ? "month" : "date"} bind:value={endPast} />
          </Col>
        </Row>
      </FormGroup>
    {/if}
  </AccordionItem>
  <AccordionItem active header="Retirement date">
    <Row class="mx-1">
      <Input type="switch" bind:checked={retired} label={retired ? "I am retired" : "I am not retired"}/>
    </Row>
    {#if retired}
      <br>
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto">I retired {canShare ? "in" : "on"}</Col>
          <Col xs="auto">
            <Input type={canShare ? "month" : "date"} bind:value={startRetirement} />
          </Col>
        </Row>
      </FormGroup>
    {/if}
  </AccordionItem>
  <AccordionItem active header="Combat zone work">
    <Row class="mx-1">
      <Input type="switch" bind:checked={combat} label={combat ? "I have worked in a combat zone" : "I have not worked in a combat zone"}/>
    </Row>
    {#if combat}
      <br>
      <FormGroup>
        <Row class="mb-2">
          <Col xs="auto">I started working in a combat zone</Col>
          <Col xs="auto">
            <Input type={canShare ? "month" : "date"} bind:value={startCombat} />
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto">and stopped</Col>
          <Col xs="auto">
            <Input type={canShare ? "month" : "date"} bind:value={endCombat} />
          </Col>
        </Row>
      </FormGroup>
    {/if}
  </AccordionItem>
</Accordion>
<br>
<Button color="primary" on:click={updateOdhSection} disabled={buttonDisabled}>
  {buttonText}
</Button>
  