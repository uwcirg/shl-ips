<script lang="ts">
    import {
      Accordion,
      AccordionItem,
      Col,
      FormGroup,
      Input,
      Label,
      Row } from 'sveltestrap';

    export let currentJob;
    export let pastJob;
    export let combatPeriod;
  
    let working = true;
    let workingPast = true;
    let combat = false;
    let jobs = {
        "Bartender [Bartenders]": "2345",
        "Certified Nursing Assistant (CNA) [Nursing Assistants]": "31-1014.00.007136",
        "Medical Researcher [Medical Scientists, Except Epidemiologists]": "19-1042.00.026469",
        "Clothier [Retail Salespersons]": "41-2031.00.008618",
    };
    let industries = {
        "Alcoholic beverage drinking places [Drinking Places (Alcoholic Beverages)": "722410.000378",
        "Home nursing services": "621610.008495",
        "Academies, college or university [Colleges, Universities, and Professional Schools]": "611310.000015",
        "Clothing stores, family [Family Clothing Stores ]": "6448140.003510",
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

    $: {
        if (working) {
            currentJob = loadCurrentJob(jobCurrent, industryCurrent, startCurrent);
        } else {
            currentJob = undefined;
        }

        if (workingPast) {
            pastJob = loadPastJob(jobPast, industryPast, startPast, endPast);
        } else {
            pastJob = undefined;
        }

        if (combat) {
            combatPeriod = loadCombatPeriod(startCombat, endCombat);
        } else {
            combatPeriod = undefined;
        }
    }

    function loadCurrentJob(job: string, industry: string, start: string) {
        return {
            job: job,
            industry: industry,
            start: start
        }

    }
    function loadPastJob(job: string, industry: string, start: string, end: string) {
        return {
            job: job,
            industry: industry,
            start: start,
            end: end
        }
    }
    function loadCombatPeriod(start: string, end: string) {
        return {
            start: start,
            end: end
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
            <Input type="select" bind:value={jobCurrent} style="width: 100px">
              {#each Object.keys(jobs) as [job, code]}
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
              {#each Object.keys(industries) as [industry, code]}
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
            <Input type="date" bind:value={startCurrent} />
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
              {#each Object.keys(jobs) as [job, code]}
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
              {#each Object.keys(industries) as [industry, code]}
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
            <Input type="date" bind:value={startPast} />
          </Col>
          <Col xs="auto">and stopped on</Col>
          <Col xs="auto">
            <Input type="date" bind:value={endPast} />
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
            <Input type="date" bind:value={startCombat} />
          </Col>
        </Row>
        <Row class="mb-2">
          <Col xs="auto">and stopped on</Col>
          <Col xs="auto">
            <Input type="date" bind:value={endCombat} />
          </Col>
        </Row>
      </FormGroup>
    {/if}
  </AccordionItem>
</Accordion>
  