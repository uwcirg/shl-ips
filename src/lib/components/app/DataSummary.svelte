<script lang="ts">
  import { download } from '$lib/utils/util.js';
  import { createEventDispatcher, getContext, onMount, tick } from 'svelte';
  import { derived, type Readable, type Writable } from 'svelte/store';
  import {
    Button,
    ButtonGroup,
    Col,
    Icon,
    Offcanvas,
    Row
  } from '@sveltestrap/sveltestrap';
  import { get } from 'svelte/store';
  import { PLACEHOLDER_SYSTEM } from '$lib/config/config';
  import { ResourceHelper } from '$lib/utils/ResourceHelper.js';
  import { getFHIRDateAndPrecision } from '$lib/utils/util';
  import type { Resource } from 'fhir/r4';
  import CategoryView from '$lib/components/app/CategoryView.svelte';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import {getFriendlySourceNameBySource} from '$lib/utils/resourceCollectionUtils';

  import AdvanceDirective from '$lib/components/resource-templates/AdvanceDirective.svelte';
  import AllergyIntolerance from '$lib/components/resource-templates/AllergyIntolerance.svelte';
  import Condition from '$lib/components/resource-templates/Condition.svelte';
  import Coverage from '$lib/components/resource-templates/Coverage.svelte';
  import Device from '$lib/components/resource-templates/Device.svelte';
  import DeviceUseStatement from '$lib/components/resource-templates/DeviceUseStatement.svelte';
  import DiagnosticReport from '$lib/components/resource-templates/DiagnosticReport.svelte';
  import Encounter from '$lib/components/resource-templates/Encounter.svelte';
  import ExplanationOfBenefit from '$lib/components/resource-templates/ExplanationOfBenefit.svelte';
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

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let userResources = fhirDataService.userResources;
  let masterPatient = fhirDataService.masterPatient;
  let allResourceCollections = derived(userResources, ($userResources) => fhirDataService.getAllResourceCollections());

  let colorMap = getContext<Writable<Map<string, string>>>('colorMap');

  export let submitting: boolean = false;

  function lastUpdatedSort(a, b) {
    let aDate = a?.meta?.lastUpdated;
    let bDate = b?.meta?.lastUpdated;
    if (aDate && !bDate) return 1;
    if (bDate && !aDate) return -1;
    if (!aDate && !bDate) return 0;
    return (new Date(aDate).getTime() - new Date(bDate).getTime());
  };

  function getResourceSortDate(resource: Resource, fieldsOrPrefixes: string[] = []): {date: Date, precision: number} | null {
    const birthdate = get(masterPatient)?.resource.birthDate;
    for (const field of fieldsOrPrefixes) {
      const val = getFHIRDateAndPrecision(resource, field, birthdate);
      if (val) return val;
    }
    return null;
  }

  function resourceSort(a: Resource, b: Resource, order: 'asc' | 'desc' = 'desc') {
    let orderFactor = order === 'asc' ? 1 : -1;
    
    let aVal: {date: Date, precision: number} | null = getResourceSortDate(a, resourceConfig[a.resourceType]?.sortFields ?? []);
    let bVal: {date: Date, precision: number} | null = getResourceSortDate(b, resourceConfig[b.resourceType]?.sortFields ?? []);
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
    'Coverage': {
      category: 'Coverages',
      component: Coverage,
      sortFields: ['period']
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
    'ExplanationOfBenefit': {
      category: 'Explanations of Benefits',
      component: ExplanationOfBenefit,
      sortFields: ['created', 'billablePeriod']
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

  interface ResourceHelperWithSource {
    source: string,
    rh: ResourceHelper
  };

  // Proxy for resourceCollection's resourcesByType to allow reactive updates
  let categorizedResourceStore: Readable<Record<string, Record<string, ResourceHelperWithSource>>> = derived(
    allResourceCollections,
    ($allResourceCollections) => {
      let resourcesByCategory: Record<string, Record<string, ResourceHelperWithSource>> = {};
      if ($allResourceCollections) {
        for (const rc of $allResourceCollections) {
          let { sourceName } = rc.getTags();
          for (const [id, rh] of Object.entries(get(rc.resources)) as Array<[string, ResourceHelper]>) {
            if (rh.resource.resourceType === 'Patient' && rh.resource?.meta?.tag?.find(t => t.system === PLACEHOLDER_SYSTEM)) {
              continue;
            }
            let type = resourceConfig[rh.resource.resourceType]?.category;
            if (!type) {
              type = rh.resource.resourceType;
            }
            if (!(type in resourcesByCategory)) {
              resourcesByCategory[type] = {};
            }
            resourcesByCategory[type][id] = {source: sourceName, rh: rh};
          }
        }
      }
      return resourcesByCategory;
    }
  );

  let patientStore: Record<string, ResourceHelperWithSource>;
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


{#if $categorizedResourceStore && Object.keys($categorizedResourceStore).length > 0}
  {#each Object.keys($categorizedResourceStore) as category}
    {#if Object.keys($categorizedResourceStore[category]).length > 0}
      <CategoryView
        class="mb-4"
        title={category}
        summary
        addFn={() => {
          
        }}
        seeAllFn={() => {
          
        }}
        sortFields={['sourceName', 'category', 'method', 'source']}
        filterFields={['sourceName', 'category', 'method', 'source']}
        >
        <div slot="resources">
          {#each Object.values($categorizedResourceStore[category]).sort((a, b) => {
            let sortValue = resourceSort(a.rh.resource, b.rh.resource);
            return sortValue;
          }) as value, index}
            {@const sourceName=getFriendlySourceNameBySource(value.source)}
            <Row class={(index > 0 ? "border-top pt-2 mt-2" : "") + " source-row"} style="overflow-x: clip; position: relative">
              <div
                class="ps-2 pe-4 tooltip-host"
                data-tooltip="From {sourceName}"
                style="max-width: 0px; align-self: stretch;"
                style:--tooltip-color={$colorMap.get(sourceName)}
                >
                <div class="p-0 m-0 rounded h-100" style="max-width: 0px; border: .2rem solid {$colorMap.get(sourceName)}"></div>
              </div>
              <Col class="ps-0 overflow-auto justify-content-center align-items-center">
                {#if value.rh.resource.resourceType in resourceConfig && resourceConfig[value.rh.resource.resourceType].component}
                  <svelte:component
                    this={resourceConfig[value.rh.resource.resourceType].component}
                    content={{
                      resource: value.rh.resource,
                      entries: Object.values($categorizedResourceStore)
                    }}
                  />
                  <!-- ResourceType: {category}
                    Resource: {JSON.stringify(value.rh.resource)} -->
                {:else if value.rh.resource.text?.div}
                  {@html value.rh.resource.text?.div}
                {:else}
                  {value.rh.tempId}
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
                      setJson(value.rh)
                    }}
                  >
                    View
                  </Button>
                {/if}
              </Col>
            </Row>
          {/each}
        </div>
      </CategoryView>
    {/if}
  {/each}
{/if}

<style>
  :global(div.resource-list-accordion:not(:has(div.accordion-collapse.show)) > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-light) !important;
  }
  :global(div.resource-list-accordion:has(div.accordion-collapse.collapsing) > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-accordion-active-bg) !important;
  }

  .tooltip-host {
    position: relative;
  }
  
  .tooltip-host::after {
    content: attr(data-tooltip);
    position: absolute;
    left: 0.5rem;
    top: calc(100% + 0.25rem);
    /* transform: translateY(); */
    background: var(--tooltip-color, #333);
    color: #fff;
    padding: 0;
    border-radius: 4px;
    font-size: 0.75rem;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: height 0.15s, padding 0.15s;
    height: 0;
    z-index: 1000;
  }
  
  .tooltip-host:hover::after {
    opacity: 1;
    height: auto;
    padding: 0.25rem 0.5rem;
  }

  :global(.source-row) {
    transition: padding-bottom 0.15s;
  }
  
  :global(.source-row:has(.tooltip-host:hover)) {
    padding-bottom: 1.75rem;
  }
</style>
