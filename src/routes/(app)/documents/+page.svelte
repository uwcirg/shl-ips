<script lang="ts">
  import {
    Accordion,
    AccordionItem,
    Button,
    ButtonGroup,
    Card,
    CardBody,
    CardFooter,
    Col,
    Icon,
    Offcanvas,
    Row,
  } from 'sveltestrap';
  import type {
    Resource
  } from "fhir/r4";
  import { download } from '$lib/utils/util';
  import AdvanceDirective from '$lib/components/resource-templates/AdvanceDirective.svelte';
  import Patient from '$lib/components/resource-templates/Patient.svelte';
  import { goto } from '$app/navigation';
  import { getContext, onMount } from 'svelte';
  import AuthService from '$lib/utils/AuthService';
  import { INTERMEDIATE_FHIR_SERVER_BASE } from '$lib/config/config';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams } from '$lib/utils/managementClient';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';

  let title = INSTANCE_CONFIG.pages?.documents?.title ?? `My Documents - ${INSTANCE_CONFIG.title}`;

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');

  let patientData: Resource[];

  onMount(async () => {
    let userId = (await AuthService.Instance.getProfile()).sub;
    let patient = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient?identifier=https://keycloak.cirg.uw.edu%7C${userId}`, {cache: "no-cache"})
      .then((response) => response.json())
      .then((data) => {
        if (data?.total > 0) {
          return data.entry?.[0].resource;
        }
      });
    if (patient) {
      let docrefSummaries = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/DocumentReference?_sort=-date&_summary=true&status=current&subject.identifier=https://keycloak.cirg.uw.edu%7C${userId}`, {cache: "no-cache"})
        .then((response) => response.json())
        .then((data) => data.entry)
        .then((data) => data?.map((entry) => entry.resource));
      patientData = [patient, ...(docrefSummaries ?? [])];
      await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/DocumentReference?_sort=-date&status=current&subject.identifier=https://keycloak.cirg.uw.edu%7C${userId}`, {cache: "no-cache"})
        .then((response) => response.json())
        .then((data) => data.entry)
        .then((data) => data?.map((entry) => entry.resource))
        .then((data) => {
          patientData = [patient, ...(data ?? [])];
        });
    } else {
      patientData = [];
    }
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

  function deleteResource(resourceType: string, id: string) {
    fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/${resourceType}/${id}`, {
      method: "DELETE"
    }).then(() => {
      location.reload();
    });
  }
</script>

<svelte:head><title>{title}</title></svelte:head>

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
  {#if patientData.length === 0}
    <Row class="mx-2">
      <Row>
        <h5>No documents found</h5>
      </Row>
    </Row>
  {:else}
    {#each patientData as resource}
      <Row class="mx-0">
        <!--wrap in accordion with title-->
        <Accordion class="mt-3">
          <AccordionItem active class="ips-section">
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
              {#if resource.resourceType !== "Patient"}
                <CardFooter>
                  <Row>
                    <Col class="flex-grow-1">
                      <Button
                          size="sm"
                          color="primary"
                          outline
                          on:click={goto(`/view/${$shlStore.at(-1).id}`)}
                      >
                        <Icon name="share-fill" /> Share
                      </Button>
                    </Col>
                    <Col class="d-flex flex-row-reverse justify-content-end align-items-end" style="max-width: max-content">
                      <Button
                          size="sm"
                          color="danger"
                          outline
                          on:click={() => deleteResource(resource.resourceType, resource.id)}
                      >
                        <Icon name="trash3" /> Delete
                      </Button>
                    </Col>
                  </Row>
                </CardFooter>
              {/if}
            </Card>
          </AccordionItem>
        </Accordion>
      </Row>
    {/each}
  {/if}
{/if}

<style>
  /* Table styling */
  :global(.ips-section table) {
    border-collapse: collapse !important;
    width: 100% !important;
  }

  :global(.ips-section th) {
    border: 1px solid lightgray !important;
    padding: 0 7px !important;
    text-align: center !important;
  }

  :global(.ips-section td) {
    margin-left: 2em !important;
  }

  :global(.ips-section thead) {
    background-color: #0c63e4;
    color: white;
  }

  /* Alternating table row coloring */
  :global(.ips-section tbody tr:nth-child(odd)) {
    background-color: #fff;
    border: 1px solid lightgray;
  }
  :global(.ips-section tbody tr:nth-child(even)) {
    background-color: #e7f1ff;
    border: 1px solid lightgray;
  }
  
  /* Sticky table header */
  :global(.ips-section th) {
    background: #0c63e4;
    position: sticky;
    top: -17px;
  }

  /* First column of generated table is usually most important */
  :global(.ips-section td:first-child) {
    font-weight: bold;
  }

  /* Limit height for section content window */
  :global(.ips-section > .accordion-collapse > .accordion-body) {
    overflow: auto !important;
    max-height: 52rem !important;
  }

  .code {
        overflow:auto;
        margin: 0;
        padding: 10px;
    }
    .code-container {
        background-color: #f5f5f5;
        border-radius: 10px;
        border: 1px solid rgb(200, 200, 200);
        overflow: hidden;
    }
    :global(div.offcanvas-body) {
        overflow-y: hidden !important;
    }

  :global(.loader) {
    width: 100%;
    height: 150px;
    margin: 40px;
    display: block;
    position: relative;
    background: #FFF;
    box-sizing: border-box;
  }
  :global(.loader::after) {
    content: '';  
    width: calc(100% - 30px);
    height: calc(100% - 30px);
    top: 15px;
    left: 15px;
    position: absolute;
    background-image: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.5) 50%, transparent 80%),
    linear-gradient(#DDD 56px, transparent 0), /* box 1 */
    linear-gradient(#DDD 24px, transparent 0), /* box 2 */
    linear-gradient(#DDD 18px, transparent 0), /* box 3 */
    linear-gradient(#DDD 66px, transparent 0); /* box 4 */
    background-repeat: no-repeat;
    background-size: 75px 130px, /* wave */
            55px 56px, /* box 1 */
            160px 30px, /* box 2 */
            220px 20px, /* box 3 */
            290px 56px; /* box 4 */
    background-position: 0% 0, /* box 1 */
              0px 0px, /* box 1 */
              70px 5px, /* box 1 */
              70px 38px, /* box 1 */
              0px 66px; /* box 1 */
    box-sizing: border-box;
    animation: animloader 1s linear infinite;
  }
  @keyframes -global-animloader {
    0% {
      background-position: 0% 0, 0 0, 70px 5px, 70px 38px, 0px 66px;
    }
    100% {
      background-position: 150% 0, 0 0, 70px 5px, 70px 38px, 0px 66px;
    }
  }
</style>