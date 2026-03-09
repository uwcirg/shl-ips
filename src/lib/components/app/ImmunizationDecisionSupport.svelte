<script lang="ts">
  import { Accordion, AccordionItem, Button, Card, CardBody, Icon, Input, Modal, ModalBody, ModalFooter, ModalHeader, Row, Col } from '@sveltestrap/sveltestrap';
  import ImmunizationRecommendationComponent from "$lib/components/resource-templates/ImmunizationRecommendation.svelte";
  import type { Patient, Immunization, ImmunizationRecommendation } from "fhir/r4";
  
  export let patient: Patient | undefined = undefined;
  export let immunizations: Immunization[] = [];

  let fetchError = "";

  const immdsUrl = "https://florence.immregistries.org/step/fhir/$immds-forecast";
  
  let recommendation: ImmunizationRecommendation | undefined = undefined;
  let birthDate: string | undefined = undefined;
  $: if (patient || immunizations) {
    recommendation = undefined;
    birthDate = birthDate || patient?.birthDate;
  };
  let displayBirthdate: string | undefined = undefined;

  async function getRecommendations() {
    if (!birthDate) {
      fetchError = "No birthdate found for summary patient. A birth date is required to request recommendations.";
      return;
    }
    displayBirthdate = birthDate;
    const body = JSON.stringify(createParameters(patient, immunizations));
    console.log(body);
    let result = await fetch(immdsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json' },
      body
    })
    .then(response => {
      if (!response.ok) {
        fetchError = response.statusText;
        throw new Error(fetchError);
      } else {
        return response;
      }
    })
    .then(response => response.text())
    .then(response => JSON.parse(response))
    .then(response => response.parameter.find((param: any) => param.name === 'recommendation')?.resource);
    if (!result) {
      fetchError = "No recommendations found";
    }
    recommendation = result;
    console.log(result);
  }

  function createParameters(patient: Patient, immunizations: Immunization[]) {
    const params = {
      resourceType: 'Parameters',
      parameter: [
        {
          name: 'assessmentDate',
          valueDate: new Date().toISOString().split('T')[0],
        },
        {
          name: 'patient',
          resource: {
            resourceType: 'Patient',
            gender: patient.gender,
            birthDate
          }
        }
      ]
    }
    if (!immunizations || immunizations.length === 0) {
      return params;
    }
    immunizations.forEach((immunization) => {
      params.parameter.push({
        name: 'immunization',
        resource: immunization
      })
    })

    return params;
  }

  let open = false;
  const toggle = () => (open = !open);
</script>

<Row class="mx-0">
  <!--wrap in accordion with title-->
  <Accordion class="mt-3">
    <AccordionItem active class="resource-content">
      <h6 slot="header" class="my-2">Immunization Recommendations</h6>
      <p>
        Retrieve immunization recommendations based on the summary's patient information and immunization history.
      </p>
      <Card style="width: 100%; max-width: 100%" class="mb-2">
        <CardBody>
          <Row style="overflow:hidden" class="d-flex justify-content-end align-content-center">
            <Col class="overflow-auto justify-content-center align-items-center">
            {#if recommendation}
              {#if displayBirthdate}
                <p class="text-secondary">Patient birthdate: {displayBirthdate}</p>
              {/if}
              <ImmunizationRecommendationComponent content={{ resource: recommendation }} />
            {:else}
              <Button
                color="primary"
                on:click={() => {
                  if (!patient?.birthDate) {
                    toggle();
                  } else {
                    getRecommendations();
                  }
                }}
              >
                Get recommendations <Icon name="caret-right-fill" />
              </Button>
              {#if fetchError}
                <p class="text-danger">{fetchError}</p>
              {/if}
            {/if}
            </Col>
          </Row>
        </CardBody>
      </Card>
    </AccordionItem>
  </Accordion>
</Row>

<Modal isOpen={open} backdrop="static" {toggle}>
  <ModalHeader {toggle}>Missing information</ModalHeader>
  <ModalBody>
    Please enter the patient's date of birth to retrieve immunization recommendations for their health summary.
    <Row class="mt-3">
      <Col>
        <Input type="date" bind:value={birthDate} />
      </Col>
    </Row>
  </ModalBody>
  <ModalFooter>
  <Row class="w-100">
    <Col class="d-flex flex-grow-1">
      <Button color="secondary" outline on:click={() => {toggle(); birthDate=patient?.birthDate}}>Cancel</Button>
    </Col>
    <Col class="d-flex flex-grow-1 justify-content-end">
      <Button color="success"  on:click={() => {toggle(); getRecommendations(); birthDate=patient?.birthDate;} }><Icon name="check" /> Get Recommendations</Button>
    </Col>
  </Row>
  </ModalFooter>
</Modal>