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
    Spinner
  } from '@sveltestrap/sveltestrap';
  import type {
    Resource
  } from "fhir/r4";
  import { download } from '$lib/utils/util';
  import { createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import type { IAuthService, ResourceRetrieveEvent } from '$lib/utils/types';
  import AdvanceDirective from '$lib/components/resource-templates/AdvanceDirective.svelte';
  import { getContext, onMount } from 'svelte';
  import { INTERMEDIATE_FHIR_SERVER_BASE } from '$lib/config/config';
  import type { Writable } from 'svelte/store';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import type { SHLAdminParams } from '$lib/utils/managementClient';

  export let disabled = false;
  
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  let fetchError = false;
  let processing = false;
  let message = '';

  let authService: IAuthService = getContext('authService');
  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');

  let patientData: Resource[];

  let sectionKey: string = "Advance Directives";
  let sectionTemplate = {
    title: "Advance Directives",
    code: {
        coding: [
        {
            system: "http://loinc.org",
            code: "42348-3",
            display: "Advance Directives"
        }
        ]
    },
    text: {
            status: "generated",
            div: "<div xmlns=\"http://www.w3.org/1999/xhtml\"><h5>Advance Directives</h5><table class=\"hapiPropertyTable\"><thead><tr><th>Scope</th><th>Status</th><th>Action Controlled</th><th>Date</th></tr></thead><tbody></tbody></table></div>"
          },
    entry: []
  };

  onMount(async () => {
    let userId = get(authService.userId);
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
      patientData = [...(docrefSummaries ?? [])];
      await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/DocumentReference?_sort=-date&status=current&subject.identifier=https://keycloak.cirg.uw.edu%7C${userId}`, {cache: "no-store"})
        .then((response) => response.json())
        .then((data) => data.entry)
        .then((data) => data?.map((entry) => entry.resource))
        .then((data) => {
          patientData = [...(data ?? [])];
        });
    } else {
      patientData = [];
    }
  });

  const components: Record<string, any> = {
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

  function prepareIps() {
    processing = false;
    let result:ResourceRetrieveEvent = {
      resources: patientData,
      sectionKey: sectionKey,
      sectionTemplate: sectionTemplate
    }
    resourceDispatch('update-resources', result);
  }
</script>

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

<p>These are the POLST documents that have already been added to your {INSTANCE_CONFIG.title} account. If you would like to share one of them, click the button below.</p>

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
        <Card style="width: 100%; max-width: 100%" class="mb-2 resource-content">
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
      </Row>
    {/each}
    <form on:submit|preventDefault={() => prepareIps()}>
      <Row>
        <Col xs="auto">
          <Button color="primary" style="width:fit-content" disabled={processing || disabled} type="submit">
            {#if !processing}
              I'd like to share one of these documents
            {:else}
              Staging...
            {/if}
          </Button>
        </Col>
        {#if processing}
          <Col xs="auto" class="d-flex align-items-center px-0">
            <Spinner color="primary" type="border" size="md"/>
          </Col>
        {/if}
        {#if disabled}
          <Col xs="auto" class="d-flex align-items-center px-0">
            Please wait...
          </Col>
        {/if}
      </Row>
    </form>
    <Row>
      {#if message}
        <span>{message}</span>
      {/if}
      {#if fetchError}
        <span class="text-danger">{fetchError}</span>
      {/if}
    </Row>
  {/if}
{/if}
