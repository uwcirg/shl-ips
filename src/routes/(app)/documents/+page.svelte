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
  import { constructPatientResource, download } from '$lib/utils/util';
  import AdvanceDirective from '$lib/components/resource-templates/AdvanceDirective.svelte';
  import Patient from '$lib/components/resource-templates/Patient.svelte';
  import { goto } from '$app/navigation';
  import { getContext, onMount } from 'svelte';
  import AuthService from '$lib/utils/AuthService';
  import { INTERMEDIATE_FHIR_SERVER_BASE } from '$lib/config/config';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams } from '$lib/utils/managementClient';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import { demographics } from '$lib/stores/demographics';

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  let mode: Writable<string> = getContext('mode');

  let patientData: Resource[];

  onMount(async () => {
    let userId = (await AuthService.Instance.getProfile()).sub;
    let patient = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient?identifier=https://keycloak.cirg.uw.edu%7C${userId}`, {cache: "no-store"})
      .then((response) => response.json())
      .then((data) => {
        if (data?.total > 0) {
          return data.entry?.[0].resource;
        }
      });
    if (patient) {
      let docrefSummaries = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/DocumentReference?_sort=-date&_summary=true&status=current&subject.identifier=https://keycloak.cirg.uw.edu%7C${userId}`, {cache: "no-store"})
        .then((response) => response.json())
        .then((data) => data.entry)
        .then((data) => data?.map((entry) => entry.resource));
      patientData = [patient, ...(docrefSummaries ?? [])];
      await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/DocumentReference?_sort=-date&status=current&subject.identifier=https://keycloak.cirg.uw.edu%7C${userId}`, {cache: "no-store"})
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

  async function resetPatientResource() {
    let userAuth = await AuthService.Instance.getProfile();
    $demographics.identifier = {
      system: 'https://keycloak.cirg.uw.edu',
      value: userAuth.sub
    };
    let patient = patientData[0];
    if (patient.resourceType !== "Patient") {
      return;
    }

    $demographics.id = patient.id;
    $demographics.first = userAuth.given_name || userAuth.firstName;
    $demographics.last = userAuth.family_name || userAuth.lastName;
    delete $demographics.dob
    delete $demographics.gender;
    delete $demographics.address;
    delete $demographics.city;
    delete $demographics.state;
    delete $demographics.zip;
    delete $demographics.country;
    delete $demographics.phone;

    let newPatient = constructPatientResource($demographics);
    newPatient.id = patient.id;

    fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient/${newPatient.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/fhir+json",
      },
      body: JSON.stringify(newPatient),
    }).then(() => {
      patientData[0] = newPatient;
    });
  }
</script>

<svelte:head>
  <title>My Documents - {INSTANCE_CONFIG.title}</title>
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
              {:else}
                <CardFooter>
                  <Row>
                    <Col class="flex-grow-1">
                      <Button
                          size="sm"
                          color="primary"
                          outline
                          on:click={() => {goto(`/account`)}}
                      >
                        <Icon name="pencil-square" /> Edit
                      </Button>
                      
                    </Col>
                    {#if $mode === "advanced"}
                      <Col class="d-flex flex-row-reverse justify-content-end align-items-end" style="max-width: max-content">
                        <Button
                            size="sm"
                            color="danger"
                            outline
                            on:click={() => resetPatientResource()}
                        >
                          <Icon name="backspace" /> Reset
                        </Button>
                      </Col>
                    {/if}
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
