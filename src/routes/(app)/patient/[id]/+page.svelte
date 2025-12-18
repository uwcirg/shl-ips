<script lang="ts">
  import { page } from '$app/stores';
  import {
    Accordion,
    AccordionItem,
    Button,
    ButtonGroup,
    Card,
    CardBody,
    Col,
    Icon,
    Offcanvas,
    Row,
  } from '@sveltestrap/sveltestrap';
  import type {
    Resource
  } from "fhir/r4";
  import { download } from '$lib/utils/util';
  import AdvanceDirective from '$lib/components/resource-templates/AdvanceDirective.svelte';
  import Patient from '$lib/components/resource-templates/Patient.svelte';
  import { onMount } from 'svelte';
  import { INTERMEDIATE_FHIR_SERVER_BASE } from '$lib/config/config';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';

  let patientData: Resource[];

  onMount(async () => {
    let patientId = $page.params.id;
    let serverUrl = INTERMEDIATE_FHIR_SERVER_BASE;
    let patient = await fetch(`${serverUrl}/Patient/${patientId}`, {cache: "no-store"})
      .then((response) => {
        if (response.status !== 200) {
          serverUrl = "https://fhir.ips-demo.dev.cirg.uw.edu/fhir";
          return fetch(`https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/${patientId}`, {cache: "no-store"})
            .then((response) => response.json());
        }
        return response.json();
      }).then((data) => data);
    let docrefSummaries = await fetch(`${serverUrl}/DocumentReference?_sort=-date&_summary=true&status=current&subject=${patientId}`, {cache: "no-store"})
      .then((response) => response.json())
      .then((data) => data.entry)
      .then((data) => data.map((entry) => entry.resource));
    patientData = [patient, ...docrefSummaries];
    await fetch(`${serverUrl}/DocumentReference?_sort=-date&status=current&subject=${patientId}`, {cache: "no-store"})
      .then((response) => response.json())
      .then((data) => data.entry)
      .then((data) => data.map((entry) => entry.resource))
      .then((data) => {
        patientData = [patient, ...data];
      });
  });

  const components: Record<string, any> = {
    "Patient": Patient,
    "DocumentReference": AdvanceDirective
  };

  let showInfo = false;
  let infoMessage = "";

  function showInfoMessage(message:string) {
    infoMessage = message;
    showInfo = true;
  }

  function hideInfoMessage() {
    showInfo = false;
    infoMessage = "";
  }

  let json = "";
  let resourceType = "";
  let isOpen = false;
  function setJson(resource:any) {
      json = JSON.stringify(resource, null, 2);
      resourceType = resource.resourceType;
      isOpen = true;
  }
  function toggle() {
      isOpen = !isOpen;
  }
</script>

<svelte:head>
  <title>Patient Documents - {INSTANCE_CONFIG.title}</title>
</svelte:head>

<Offcanvas
    {isOpen}
    {toggle}
    scroll={false}
    header={resourceType + " JSON"}
    placement="end"
    title={resourceType + " JSON"}
    style="display: flex;  overflow-y:hidden; height: 100dvh;"
>
    <Row class="d-flex" style="height: 100%">
            <Row class="d-flex pe-0" style="height:calc(100% - 50px)">
                <Col class="d-flex pe-0" style="height:100%">
                    <div class="d-flex pe-0 pb-0 code-container">
                        <pre class="code"><code>{json}</code></pre>
                    </div>
                </Col>
            </Row>
            <Row class="d-flex pe-0" style="height:50px">
                <Col class="d-flex justify-content-start align-items-end" style="padding-top: 1rem">
                    <ButtonGroup>
                        <Button
                            size="sm"
                            color="primary"
                            on:click={() => navigator.clipboard.writeText(json)}
                        ><Icon name="clipboard" /> Copy</Button>
                        <Button
                            size="sm"
                            outline
                            color="secondary"
                            on:click={() => download(resourceType + ".json", json)}
                        ><Icon name="download" /> Download</Button>
                      </ButtonGroup>
                </Col>
            </Row>
    </Row>
</Offcanvas>

{#if showInfo}
  <Row class="text-info">{infoMessage}</Row>
{/if}
{#if !patientData}
  <Row id="ips-loader" class="mx-2">
    <Row>
      {@html status}
    </Row>
    <span class="loader"></span>
  </Row>
{:else}
{#each patientData as resource}
  <Row class="mx-0">
    <!--wrap in accordion with title-->
    <Accordion class="mt-3">
      <AccordionItem active class="resource-content">
        <h6 slot="header" class="my-2">{resource.resourceType}</h6>
          <Card style="width: 100%; max-width: 100%" class="mb-2">
            <CardBody>
                <Row style="overflow:hidden" class="d-flex justify-content-end align-content-center">
                  <Col class="flex-grow-1" style="overflow:hidden">
                    {#if resource.resourceType in components}
                      <svelte:component
                        this={components[resource.resourceType]}
                        content={{ resource: resource }}
                      />
                    {/if}
                  </Col>
                  <Col class="d-flex flex-row-reverse justify-content-end align-items-start" style="max-width: max-content">
                    <Button
                        size="sm"
                        color="secondary"
                        outline
                        on:click={() => setJson(resource)}
                    >
                      View
                    </Button>
                  </Col>
                </Row>
              </CardBody>
          </Card>
      </AccordionItem>
    </Accordion>
  </Row>
{/each}
{/if}
