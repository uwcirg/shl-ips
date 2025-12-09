<script lang="ts">
  import { download } from '$lib/utils/util.js';
  import { createEventDispatcher, getContext } from 'svelte';
  import { derived, type Readable, type Writable } from 'svelte/store';
  import {
    Accordion,
    AccordionItem,
    Badge,
    Button,
    ButtonGroup,
    Card,
    CardBody,
    CardHeader,
    Col,
    FormGroup,
    Icon,
    Input,
    Offcanvas,
    Label,
    Row
  } from 'sveltestrap';
  import { get } from 'svelte/store';
  import { PLACEHOLDER_SYSTEM } from '$lib/config/config';
  import { ResourceHelper } from '$lib/utils/ResourceHelper.js';
  import type { ResourceCollection } from '$lib/utils/ResourceCollection.js';
  import { getFHIRDateAndPrecision } from '$lib/utils/util';
  import type { Resource } from 'fhir/r4';

  import AdvanceDirective from '$lib/components/resource-templates/AdvanceDirective.svelte';
  import AllergyIntolerance from '$lib/components/resource-templates/AllergyIntolerance.svelte';
  import Condition from '$lib/components/resource-templates/Condition.svelte';
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

  export let resourceCollection: ResourceCollection;
  export let scroll: boolean = true;

  function lastUpdatedSort(a, b) {
    let aDate = a?.meta?.lastUpdated;
    let bDate = b?.meta?.lastUpdated;
    if (aDate && !bDate) return 1;
    if (bDate && !aDate) return -1;
    if (!aDate && !bDate) return 0;
    return (new Date(aDate) as any) - (new Date(bDate) as any);
  };

  function getResourceSortDate(resource: Resource, fieldsOrPrefixes: string[] = []): {date: number, precision: number} | null {
    const birthdate = get(resourceCollection.patient)?.birthDate;
    for (const field of fieldsOrPrefixes) {
      const val = getFHIRDateAndPrecision(resource, field, birthdate);
      if (val) return val;
    }
    return null;
  }

  function resourceSort(a: Resource, b: Resource, order: 'asc' | 'desc' = 'desc') {
    let orderFactor = order === 'asc' ? 1 : -1;
    
    let aVal: {date: number, precision: number} | null = getResourceSortDate(a, resourceConfig[a.resourceType].sortFields);
    let bVal: {date: number, precision: number} | null = getResourceSortDate(b, resourceConfig[b.resourceType].sortFields);
    if (aVal && !bVal) return 1 * orderFactor;
    if (bVal && !aVal) return -1 * orderFactor;
    if (!aVal && !bVal) return lastUpdatedSort(a, b) * orderFactor;
    let val = aVal.date - bVal.date;
    if (val === 0) val = bVal.precision - aVal.precision;
    return val * orderFactor;
  }

  const resourceConfig: Record<string, any> = {
    'AllergyIntolerance': {
      category: 'Allergies and Intolerances',
      component: AllergyIntolerance,
      sortFields: ['onset', 'lastOccurrence', 'recordedDate']
    },
    'Condition': {
      category: 'Conditions',
      component: Condition,
      sortFields: ['onset', 'abatement', 'recordedDate']
    },
    'Consent': {
      category: 'Advance Directives',
      component: AdvanceDirective,
      sortFields: ['dateTime']
    },
    'Device': {
      category: 'Devices',
      component: Device,
    },
    'DeviceUseStatement': {
      category: 'Devices',
      component: DeviceUseStatement,
      sortFields: ['timing', 'recordedOn']
    },
    'DiagnosticReport': {
      category: 'Diagnostics',
      component: DiagnosticReport,
      sortFields: ['effective', 'instant']
    },
    'DocumentReference': {
      category: 'Documents',
      component: AdvanceDirective,
      sortFields: ['date']
    },
    'Encounter': {
      category: 'Encounters',
      component: Encounter,
      sortFields: ['period']
    },
    'Goal': {
      category: 'Goals',
      component: Goal,
      sortFields: ['start', 'target']
    },
    'Immunization': {
      category: 'Immunizations',
      component: Immunization,
      sortFields: ['occurrence']
    },
    'Location': {
      category: 'Locations',
      component: Location,
    },
    'Medication': {
      category: 'Medications',
      component: Medication,
    },
    'MedicationRequest': {
      category: 'Medications',
      component: MedicationRequest,
      sortFields: ['reported', 'authoredOn']
    },
    'MedicationStatement': {
      category: 'Medications',
      component: MedicationStatement,
      sortFields: ['effective', 'dateAsserted']
    },
    'Observation': {
      category: 'Observations/Results',
      component: Observation,
      sortFields: ['effective', 'issued']
    },
    'Organization': {
      category: 'Organizations',
      component: Organization,
    },
    'Patient': {
      category: 'Patient',
      component: Patient,
    },
    'Practitioner': {
      category: 'Practitioners',
      component: Practitioner,
    },
    'Procedure': {
      category: 'Procedures',
      component: Procedure,
      sortFields: ['performed']
    },
    'QuestionnaireResponse': {
      category: 'Questionnaires',
      component: QuestionnaireResponse,
      sortFields: ['authored']
    }
  };
  
  const statusDispatch = createEventDispatcher<{ 'status-update': string }>();
  const errorDispatch = createEventDispatcher<{ error: string }>();

  let mode: Writable<string> = getContext('mode');

  let reference: string;
  let selectedPatient = resourceCollection.selectedPatient;

  // Proxy for resourceCollection's resourcesByType to allow reactive updates
  let categorizedResourceStore: Readable<Record<string, Record<string, ResourceHelper>>> = derived(
    resourceCollection.resources,
    ($resources) => {
      let resourcesByType: Record<string, Record<string, ResourceHelper>> = {};
      if ($resources) {
        for (const rh of Object.values($resources) as ResourceHelper[]) {
          if (rh.resource.resourceType === 'Patient' && rh.resource?.meta?.tag?.find(t => t.system === PLACEHOLDER_SYSTEM)) {
            continue;
          }
          let type = resourceConfig[rh.resource.resourceType]?.category;
          if (!type) { continue }
          if (!(type in resourcesByType)) {
            resourcesByType[type] = {};
          }
          resourcesByType[type][rh.tempId] = rh;
        }
      }
      return resourcesByType;
    }
  );

  let patientStore: Record<string, ResourceHelper>;
  $: {
    if ($categorizedResourceStore) {
      patientStore = $categorizedResourceStore['Patient'];
    }
  }
  let patientBadgeColor: string = 'danger';
  let patientCount: number = 0;
  $: {
    if (patientStore) {
      patientCount = Object.keys(patientStore).length;
    }
  }
  $: patientBadgeColor = patientCount > 1 ? 'danger' : 'secondary';

  function updateBadge(type: string, color = '') {
    if (type === 'Patient') {
      let badgeColor;
      if (color) {
        badgeColor = color;
      } else if (patientBadgeColor === 'danger') {
        badgeColor = 'secondary';
      }
      patientBadgeColor = badgeColor ?? patientBadgeColor;
    }
  }

  let json = '';
  let resourceType = '';
  let isOpen = false;
  function setJson(rh: ResourceHelper) {
    json = JSON.stringify(rh.resource, null, 2);
    resourceType = rh.resource.resourceType;
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
  header={resourceType + ' JSON'}
  placement="end"
  title={resourceType + ' JSON'}
  style="display: flex;  overflow-y:hidden; height: 100dvh; width: fit-content; max-width: 80dvw; min-width: var(--bs-offcanvas-width);"
>
  <Row class="d-flex" style="height: 100%">
    <Row class="d-flex pe-0" style="height:calc(100% - 50px)">
      <Col class="d-flex pe-0" style="height:100%">
        <div class="d-flex pe-0 pb-0 code-container w-100">
          <pre class="code"><code>{json}</code></pre>
        </div>
      </Col>
    </Row>
    <Row class="d-flex pe-0" style="height:50px">
      <Col class="d-flex justify-content-start align-items-end" style="padding-top: 1rem">
        <ButtonGroup>
          <Button size="sm" color="primary" on:click={() => navigator.clipboard.writeText(json)}
            ><Icon name="clipboard" /> Copy</Button
          >
          <Button
            size="sm"
            outline
            color="secondary"
            on:click={() => download(resourceType + '.json', json)}
          >
            <Icon name="download" /> Download
          </Button>
        </ButtonGroup>
      </Col>
    </Row>
  </Row>
</Offcanvas>


{#if $categorizedResourceStore}
  <Accordion stayOpen class="w-100">
    {#if Object.keys($categorizedResourceStore).length > 0}
      {#each Object.keys($categorizedResourceStore) as category}
        {#if Object.keys($categorizedResourceStore[category]).length > 0}
          <AccordionItem class="resource-content {scroll ? "scroll" : ""} resource-list-accordion" active={Object.keys($categorizedResourceStore[category]).length <= 3} on:toggle={() => updateBadge(category)}>
            <span slot="header">
              {category}
              {#if category === 'Patients'}
                <Badge positioned class="mx-1" color={patientBadgeColor}>
                  {patientCount}
                </Badge>
              {:else}
                <Badge
                  positioned
                  class="mx-1"
                  color={Object.values($categorizedResourceStore[category]).filter(
                    (resource) => resource.include
                  ).length == Object.keys($categorizedResourceStore[category]).length
                    ? 'primary'
                    : Object.values($categorizedResourceStore[category]).filter(
                          (resource) => resource.include
                        ).length == Object.keys($categorizedResourceStore[category]).length
                      ? 'primary'
                      : Object.values($categorizedResourceStore[category]).filter(
                            (resource) => resource.include
                          ).length > 0
                        ? 'info'
                        : 'secondary'}
                >
                  {Object.values($categorizedResourceStore[category]).filter(
                    (resource) => resource.include
                  ).length}
                </Badge>
              {/if}
            </span>
            {#each Object.values($categorizedResourceStore[category]).sort((a, b) => {
              let value = resourceSort(a.resource, b.resource);
              return value;
            }) as value, index}
                <Row class={index > 0 ? "border-top pt-2 mt-2" : ""} style="overflow: hidden">
                  <Col class="justify-content-center align-items-center">
                    {#if value.resource.resourceType in resourceConfig}
                      <svelte:component
                        this={resourceConfig[value.resource.resourceType].component}
                        content={{
                          resource: value.resource,
                          entries: resourceCollection.flattenResources($categorizedResourceStore)
                        }}
                      />
                      <!-- ResourceType: {category}
                        Resource: {JSON.stringify(value.resource)} -->
                    {:else if value.resource.text?.div}
                      {@html value.resource.text?.div}
                    {:else}
                      {value.tempId}
                    {/if}
                  </Col>
                  <Col class="d-flex justify-content-end align-items-center" style="max-width: fit-content">
                    {#if $mode === 'advanced'}
                      <Button
                        size="sm"
                        color="secondary"
                        outline
                        on:click={(event) => {
                          event.stopPropagation();
                          setJson(value)
                        }}
                      >
                        View
                      </Button>
                    {/if}
                  </Col>
                </Row>
            {/each}
          </AccordionItem>
        {/if}
      {/each}
    {/if}
  </Accordion>
{/if}

<style>
  :global(div.resource-list-accordion:not(:has(div.accordion-collapse.show)) > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-light) !important;
  }
  :global(div.resource-list-accordion:has(div.accordion-collapse.collapsing) > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-accordion-active-bg) !important;
  }
</style>