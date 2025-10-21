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
  import { PLACEHOLDER_SYSTEM } from '$lib/config/config';
  import { ResourceHelper } from '$lib/utils/ResourceHelper.js';
  import type { ResourceCollection } from '$lib/utils/ResourceCollection.js';
  import type { BundleEntry } from 'fhir/r4';

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

  const components: Record<string, any> = {
    'AllergyIntolerance': AllergyIntolerance,
    'Condition': Condition,
    'Consent': AdvanceDirective,
    'Device': Device,
    'DeviceUseStatement': DeviceUseStatement,
    'DiagnosticReport': DiagnosticReport,
    'DocumentReference': AdvanceDirective,
    'Encounter': Encounter,
    'Goal': Goal,
    'Immunization': Immunization,
    'Location': Location,
    'Medication': Medication,
    'MedicationRequest': MedicationRequest,
    'MedicationStatement': MedicationStatement,
    'Observation': Observation,
    'Organization': Organization,
    'Patient': Patient,
    'Practitioner': Practitioner,
    'Procedure': Procedure,
    'Patient Story': Goal,
    'Occupational Data': Observation,
    'Advance Directives': AdvanceDirective,
    'QuestionnaireResponse': QuestionnaireResponse
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
          if (!(rh.resource.resourceType in resourcesByType)) {
            resourcesByType[rh.resource.resourceType] = {};
          }
          resourcesByType[rh.resource.resourceType][rh.tempId] = rh;
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
  <Accordion>
    {#if Object.keys($categorizedResourceStore).length > 0}
      {#each Object.keys($categorizedResourceStore) as category}
        {#if Object.keys($categorizedResourceStore[category]).length > 0}
          <AccordionItem on:toggle={() => updateBadge(category)}>
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
            <FormGroup>
              {#each Object.keys($categorizedResourceStore[category]) as key}
                <Card style="width: 100%; max-width: 100%" class="mb-2">
                  <CardHeader>
                    <Row>
                      <Col class="d-flex justify-content-start align-items-center">
                        <span style="font-size:small">{$categorizedResourceStore[category][key].resource.resourceType}</span>
                      </Col>
                      {#if $mode === 'advanced'}
                        <Col class="d-flex justify-content-end align-items-center">
                          <Button
                            size="sm"
                            color="secondary"
                            outline
                            on:click={() => setJson($categorizedResourceStore[category][key])}
                          >
                            View
                          </Button>
                        </Col>
                      {/if}
                    </Row>
                  </CardHeader>
                  <Label style="width: 100%">
                    <CardBody>
                      <Row style="overflow:hidden">
                        <Col class="resource-content justify-content-center align-items-center">
                          {#if category in components}
                            <svelte:component
                              this={components[category]}
                              content={{
                                resource: $categorizedResourceStore[category][key].resource,
                                entries: resourceCollection.flattenResources($categorizedResourceStore)
                              }}
                            />
                            <!-- ResourceType: {category}
                              Resource: {JSON.stringify($categorizedResourceStore[category][key].resource)} -->
                          {:else if $categorizedResourceStore[category][key].resource.text?.div}
                            {@html $categorizedResourceStore[category][key].resource.text?.div}
                          {:else}
                            {$categorizedResourceStore[category][key].tempId}
                          {/if}
                        </Col>
                      </Row>
                    </CardBody>
                  </Label>
                </Card>
              {/each}
            </FormGroup>
          </AccordionItem>
        {/if}
      {/each}
    {/if}
  </Accordion>
{/if}