<script lang='ts'>
    import { uploadResources } from '$lib/utils/resourceUploader.js';
    import { download } from '$lib/utils/util.js';
    import { createEventDispatcher, getContext } from 'svelte';
    import { type Writable } from 'svelte/store';
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
        Row } from '@sveltestrap/sveltestrap';
    import { ResourceHelper } from '$lib/utils/ResourceHelper.js';
    import type { IPSResourceCollection } from '$lib/utils/IPSResourceCollection.js';
    import type { IPSRetrieveEvent } from '$lib/utils/types.js';
    import type { CompositionSection, BundleEntry } from 'fhir/r4';

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

    export let submitting: boolean;
    export let resourceCollection: IPSResourceCollection;

    const components: Record<string, any> = {
        "AllergyIntolerance": AllergyIntolerance,
        "Condition": Condition,
        "Consent": AdvanceDirective,
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
        "Patient Story": Goal,
        "Occupational Data": Observation,
        "Advance Directives": AdvanceDirective,
        "QuestionnaireResponse": QuestionnaireResponse
    };

    const ipsDispatch = createEventDispatcher<{ 'ips-retrieved': IPSRetrieveEvent }>();
    const statusDispatch = createEventDispatcher<{ 'status-update': string }>();
    const errorDispatch = createEventDispatcher<{ 'error': string }>();

    let mode: Writable<string> = getContext('mode');

    let reference: string;
    let selectedPatient = resourceCollection.selectedPatient;

    // Proxy for resourceCollection's resourcesByType to allow reactive updates
    let resourcesByTypeStore: Writable<Record<string, Record<string, ResourceHelper>>>;
    $: resourcesByTypeStore = resourceCollection.resourcesByType;

    let extensionSectionStore: Writable<Record<string, CompositionSection|false>>;
    $: extensionSectionStore = resourceCollection.extensionSections;

    let patientStore: Record<string, ResourceHelper>;
    $: {
        if ($resourcesByTypeStore) {
            patientStore = $resourcesByTypeStore["Patient"];
        }
    }
    let patientBadgeColor: string = "danger";
    let patientCount: number = 0;
    $: {
        if (patientStore) {
            patientCount = Object.keys(patientStore).length;
        }
    }
    $: patientBadgeColor = patientCount > 1 ? "danger" : "secondary";

    $: {
        if (submitting) {
            confirm().catch(error => {
                submitting = false;
                console.error(error);
                errorDispatch("error", error.message);
            });
        }
    }

    /**
     * Confirms the IPS content, then uploads the selected resources,
     * fetches the IPS, and calls the event dispatcher to pass the IPS to the parent component.
     */
    async function confirm() {
        submitting = true;

        statusDispatch("status-update", "Adding data");
        try {
            let selectedIPSResources = resourceCollection.getSelectedIPSResources().map((rh:ResourceHelper) => {
                return rh.resource;
            });
            reference = await uploadResources(selectedIPSResources);
        } catch (e:any) {
            throw new Error("Unable to upload resources", {cause: e});
        }

        let content:any;
        statusDispatch("status-update", "Building IPS");
        const contentResponse = await fetch(reference!, {
            headers: { accept: 'application/fhir+json' }
        }).then(function(response) {
            if (!response.ok) {
                // reject the promise if we didn't get a 2xx response
                throw new Error("Unable to fetch IPS", {cause: response});
            } else {
                return response;
            }
        });
        content = await contentResponse.json();

        // Add injected resources to existing IPS
        if (content) {
            content = resourceCollection.extendIPS(content);
        }
        content.entry.map((entry: BundleEntry) => {
            if (entry.resource && 'extension' in entry.resource && entry.resource.extension) {
                entry.resource.extension = entry.resource.extension.filter(function(item) {
                    return item.url !== "http://hl7.org/fhir/StructureDefinition/narrativeLink";
                });
                if (entry.resource.extension.length === 0) {
                    delete entry.resource.extension
                }
            }
            return entry;
        })
        ipsDispatch('ips-retrieved', { ips: content });
        // submitting = false;
    }

    function updateBadge(type:string, color="") {
        if (type === "Patient") {
            let badgeColor;
            if (color) {
                badgeColor = color;
            } else if (patientBadgeColor === "danger") {
                badgeColor = "secondary";
            }
            patientBadgeColor = badgeColor ?? patientBadgeColor;
        }
    }

    let json = "";
    let resourceType = "";
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

<AccordionItem active class="edit-data">
    <h5 slot="header" class="my-2">5. Directly edit your health summary content</h5>
    <Label>Select which resources to include in your customized IPS</Label>
    {#if $resourcesByTypeStore}
    <Accordion>
        {#if Object.keys($resourcesByTypeStore).length > 0}
            {#each Object.keys($resourcesByTypeStore) as resourceType}
                {#if Object.keys($resourcesByTypeStore[resourceType]).length > 0}
                    <AccordionItem on:toggle={() => updateBadge(resourceType)}>
                        <span slot="header">
                            {#if resourceType === "Patient"}
                                Patients
                                <Badge
                                    class="mx-1"
                                    color={patientBadgeColor}
                                >
                                    {patientCount}
                                </Badge>
                            {:else}
                                {#if resourceType in $extensionSectionStore}
                                    {resourceType}
                                {:else}
                                    {`${resourceType}s`}
                                {/if}
                                <Badge
                                    class="mx-1"
                                    color={
                                        Object.values($resourcesByTypeStore[resourceType])
                                            .filter(resource => resource.include).length
                                            == Object.keys($resourcesByTypeStore[resourceType]).length
                                            ? "primary"
                                            : Object.values($resourcesByTypeStore[resourceType])
                                                .filter(resource => resource.include).length
                                                == Object.keys($resourcesByTypeStore[resourceType]).length
                                                ? "primary"
                                                : Object.values($resourcesByTypeStore[resourceType])
                                                    .filter(resource => resource.include).length
                                                    > 0
                                                    ? "info"
                                                    : "secondary"
                                    }>
                                    {Object.values($resourcesByTypeStore[resourceType]).filter(resource => resource.include).length}
                                </Badge>
                            {/if}
                        </span>
                        <FormGroup>
                            {#each Object.keys($resourcesByTypeStore[resourceType]) as key}
                                <Card style="width: 100%; max-width: 100%" class="mb-2">
                                    <CardHeader>
                                        <Row>
                                            <Col class="d-flex justify-content-start align-items-center">
                                                <span style="font-size:small">{resourceType}</span>
                                            </Col>
                                            {#if $mode === "advanced"}
                                                <Col class="d-flex justify-content-end align-items-center">
                                                    <Button
                                                        size="sm"
                                                        color="secondary"
                                                        outline
                                                        on:click={() => setJson($resourcesByTypeStore[resourceType][key])}
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
                                                <Col xs=auto class="d-flex align-items-top pt-4 pe-0">
                                                    {#if resourceType === "Patient"}
                                                        <Input id={key} type="radio" bind:group={$selectedPatient} value={key} />
                                                    {:else}
                                                        <Input id={key} type="checkbox" bind:checked={$resourcesByTypeStore[resourceType][key].include} value={key} />
                                                    {/if}
                                                </Col>
                                                <Col class="justify-content-center align-items-center">
                                                    {#if resourceType in components}
                                                        <svelte:component
                                                            this={components[resourceType]}
                                                            content={{
                                                                resource: $resourcesByTypeStore[resourceType][key].resource,
                                                                entries: resourceCollection.flattenResources($resourcesByTypeStore)}} />
                                                        <!-- ResourceType: {resourceType}
                                                        Resource: {JSON.stringify($resourcesByTypeStore[resourceType][key].resource)} -->
                                                    {:else if $resourcesByTypeStore[resourceType][key].resource.text?.div}
                                                        {@html $resourcesByTypeStore[resourceType][key].resource.text?.div}
                                                    {:else}
                                                        {$resourcesByTypeStore[resourceType][key].tempId}
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
</AccordionItem>

<style>
    /* Table styling */
  :global(table) {
    border-collapse: collapse !important;
    width: 100% !important;
  }

  :global(th) {
    border: 1px solid lightgray !important;
    padding: 0 7px !important;
    text-align: center !important;
  }

  :global(td) {
    margin-left: 2em !important;
  }

  :global(thead) {
    background-color: #0c63e4;
    color: white;
  }

  /* Alternating table row coloring */
  :global(tbody tr:nth-child(odd)) {
    background-color: #fff;
    border: 1px solid lightgray;
  }
  :global(tbody tr:nth-child(even)) {
    background-color: #e7f1ff;
    border: 1px solid lightgray;
  }
  
  /* Sticky table header */
  :global(th) {
    background: #0c63e4;
    position: sticky;
    top: -17px;
  }

  /* First column of generated table is usually most important */
  :global(td:first-child) {
    font-weight: bold;
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
</style>
