<script lang="ts">
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
    Bundle,
    Composition,
    CompositionSection,
    Resource
  } from "fhir/r4";
  import { download } from '$lib/utils/util.js';

  export let bundle: Bundle;
  export let mode: string;

  import AdvanceDirective from '$lib/components/resource-templates/AdvanceDirective.svelte';
  import AllergyIntolerance from '$lib/components/resource-templates/AllergyIntolerance.svelte';
  import Condition from '$lib/components/resource-templates/Condition.svelte';
  import Consent from '$lib/components/resource-templates/Consent.svelte';
  import Device from '$lib/components/resource-templates/Device.svelte';
  import DeviceUseStatement from '$lib/components/resource-templates/DeviceUseStatement.svelte';
  import DiagnosticReport from '$lib/components/resource-templates/DiagnosticReport.svelte';
  import Encounter from '$lib/components/resource-templates/Encounter.svelte';
  import Goal from '$lib/components/resource-templates/Goal.svelte';
  import Immunization from '$lib/components/resource-templates/Immunization.svelte';
  import Location from '$lib/components/resource-templates/Location.svelte';
  import Medication from '$lib/components/resource-templates/Medication.svelte';
  import MedicationRequest from '$lib/components/resource-templates/MedicationRequest.svelte';
  import MedicationStatement from '$lib/components/resource-templates/MedicationStatement.svelte';
  import Observation from '$lib/components/resource-templates/Observation.svelte';
  import Organization from '$lib/components/resource-templates/Organization.svelte';
  import Patient from '$lib/components/resource-templates/Patient.svelte';
  import Practitioner from '$lib/components/resource-templates/Practitioner.svelte';
  import Procedure from '$lib/components/resource-templates/Procedure.svelte';
  import OccupationalData from '$lib/components/resource-templates/OccupationalData.svelte';
  import QuestionnaireResponse from '$lib/components/resource-templates/QuestionnaireResponse.svelte';
  import SectionExtension from '$lib/components/resource-templates/SectionExtension.svelte';

  const components: Record<string, any> = {
    "AllergyIntolerance": AllergyIntolerance,
    "Condition": Condition,
    "Consent": Consent,
    "Device" : Device,
    "DeviceUseStatement": DeviceUseStatement,
    "DiagnosticReport": DiagnosticReport,
    "DocumentReference": AdvanceDirective,
    "Encounter": Encounter,
    "Goal": Goal,
    "Immunization": Immunization,
    "Location": Location,
    "Medication": Medication,
    "MedicationRequest": MedicationRequest,
    "MedicationStatement": MedicationStatement,
    "Observation": Observation,
    "Organization": Organization,
    "Patient": Patient,
    "Practitioner": Practitioner,
    "Procedure": Procedure,
    "Occupational Data": OccupationalData,
    "Advance Directives": AdvanceDirective,
    "QuestionnaireResponse": QuestionnaireResponse
  };

  interface IpsContent {
    section: CompositionSection;
    entries: Resource[];
    useText: boolean;
  }

  let ipsContent: Record<string, IpsContent> = {};
  $: {
    if (bundle) {
      ipsContent = getIpsContent(bundle);
    }
  }

  function getIpsContent(ips: Bundle) {
    let content: Record<string, IpsContent> = {};
    // let entries = Object.fromEntries(ips.entry?.map((entry) => [entry.id, entry.resource]));
    let compositions = ips.entry?.filter((entry) => entry.resource?.resourceType === 'Composition');
    if (!compositions || !compositions[0]) {
      return content;
    }
    let patient = ips.entry?.filter((entry) => entry.resource?.resourceType === 'Patient').map((entry) => entry.resource);
    if (patient?.[0]) {
      let patientName = patient[0].name?.[0]?.text ??
        `${patient[0].name?.[0]?.prefix ?? ""} ${patient[0].name?.[0]?.given?.join(' ') ?? ""} ${patient[0].name?.[0]?.family ?? ""}`;
      content["Patient"] = {
        section: {
          text: {
            status: 'generated',
            div: patient[0].text?.div ??
                `<b>${patientName}</b><br>
                  Birth Date: ${patient[0].birthDate ?? ""}<br>
                  Gender: ${patient[0].gender ?? ""}`
          }
        },
        entries: patient as Resource[],
        useText: false
      }
    }
    let composition = compositions[0].resource as Composition;
    composition.section?.forEach((section) => {
      let title = (section.title ?? section.code?.coding?.[0].display) ?? "[Untitled section]";
      let entries = section.entry?.map((entry) => {
          if (entry.reference) {
            return getEntry(ips, entry.reference) as Resource;
          }
        }).filter((entry) => entry !== undefined) ?? [];
      let useText = entries.filter((entry) => entry.resourceType in components).length === 0;

      let sectionContent = {
        section: section, // Composition.section
        entries: entries, // Resources from Composition.section.entry
        useText: useText  // True when section contains unsupported resource types
      };
      content[title] = sectionContent;
    });

    return content;
  }

  // For machine-readable content, use the reference in the Composition.section.entry to retrieve resource from Bundle
  function getEntry(ips: Bundle, fullUrl: string) {
    var result;
    ips.entry?.forEach(function (entry) {
      if (entry.fullUrl?.includes(fullUrl)) {
        console.log(`match ${fullUrl}`);
        result = entry.resource;
      } else {
      // Attempt to match based on resource and uuid
        let newMatch = fullUrl
        if (entry.resource && entry.resource.resourceType) {
          // remove the resource from reference
          newMatch = newMatch.replace(entry.resource.resourceType, '');
          // remove slash
          newMatch = newMatch.replace(/\//g, '');
          // console.log(newMatch); 
        }
        if (entry.fullUrl?.includes(newMatch)) {
          console.log(`match uuid ${newMatch}`);
          result = entry.resource;
        }
      }
    });
    if (!result) {
      console.log(`missing reference ${fullUrl}`);
      result = {};
    }
    return result;
  };

  function getSections() {
    return Object.entries(ipsContent).sort((a, b) => {
      if (a[0] === "Patient") { return -1; }
      if (b[0] === "Patient") { return 1; }
      return a[0].localeCompare(b[0]);
    });
  }

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
{#each getSections() as [title, sectionContent]}
  <Row class="mx-0">
    <!--wrap in accordion with title-->
    <Accordion class="mt-3">
      <AccordionItem active class="resource-content">
        <h6 slot="header" class="my-2">{title}</h6>
        {#if sectionContent.useText || mode === "text"}
          {#if sectionContent.section.text?.div}
            {@html sectionContent.section.text?.div}
          {:else}
            No text available
          {/if}
        {:else}
          {#if sectionContent.section.extension}
            {#each sectionContent.section.extension as extension}
              <Card style="width: 100%; max-width: 100%" class="mb-2">
                <CardBody>
                  <Row class="overflow-auto d-flex justify-content-end align-content-center">
                    <Col class="flex-grow-1" style="overflow:hidden">
                      <svelte:component
                        this={SectionExtension}
                        content={{resource: extension, entries: bundle.entry}}
                      />
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            {/each}
          {/if}
          <Card style="width: 100%; max-width: 100%" class="mb-2">
              {#each sectionContent.entries as resource, index}
                <CardBody class={index > 0 ? "border-top" : ""}>
                  <Row style="overflow:hidden" class="d-flex justify-content-end align-content-center">
                    <Col class="overflow-auto justify-content-center align-items-center">
                      {#if mode === "app" && resource.resourceType in components}
                        <svelte:component
                          this={components[resource.resourceType]}
                          content={{resource: resource, entries: bundle.entry}}
                        />
                      {:else}
                        {#if mode === "app"}
                          {showInfoMessage(`Unsupported sections displayed using composition narratives`)};
                        {/if}
                      {/if}
                    </Col>
                    <Col class="d-flex justify-content-end align-items-center" style="max-width: fit-content">
                      <Button
                        size="sm"
                        color="secondary"
                        outline
                        on:click={(event) => {
                          setJson(resource)
                        }}
                      >
                        View
                      </Button>
                    </Col>
                  </Row>
                </CardBody>
              {/each}
            </Card>
          {/if}
      </AccordionItem>
    </Accordion>
  </Row>
{/each}
