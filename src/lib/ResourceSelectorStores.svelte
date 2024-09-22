<script lang='ts'>
    import { uploadResources } from './resourceUploader.js';
    import { createEventDispatcher } from 'svelte';
    import { derived, type Writable } from 'svelte/store';
    import {
        Accordion,
        AccordionItem,
        Badge,
        Card,
        CardBody,
        CardHeader,
        Col,
        FormGroup,
        Input,
        Label,
        Row } from 'sveltestrap';
    import { ResourceHelper } from './ResourceHelper.js';
    import type { IPSResourceCollectionStore } from './IPSResourceCollectionStore.js';
    import type { IPSExtension } from './IPSExtension.js';
    import type { IPSRetrieveEvent } from './types.js';

    import AdvanceDirective from './resource-templates/AdvanceDirective.svelte';
    import AllergyIntolerance from './resource-templates/AllergyIntolerance.svelte';
    import Condition from './resource-templates/Condition.svelte';
    import DiagnosticReport from './resource-templates/DiagnosticReport.svelte';
    import Encounter from './resource-templates/Encounter.svelte';
    import Immunization from './resource-templates/Immunization.svelte';
    import Location from './resource-templates/Location.svelte';
    import Medication from './resource-templates/Medication.svelte';
    import MedicationRequest from './resource-templates/MedicationRequest.svelte';
    import MedicationStatement from './resource-templates/MedicationStatement.svelte';
    import Observation from './resource-templates/Observation.svelte';
    import Organization from './resource-templates/Organization.svelte';
    import Patient from './resource-templates/Patient.svelte';
    import Practitioner from './resource-templates/Practitioner.svelte';
    import Procedure from './resource-templates/Procedure.svelte';
    import SocialHistory from './resource-templates/SocialHistory.svelte';

    export let submitting: boolean;
    export let resourceStore: IPSResourceCollectionStore;
    export let extensionStores: Writable<IPSExtension>[];

    const components: Record<string, any> = {
        "AllergyIntolerance": AllergyIntolerance,
        "Condition": Condition,
        "Consent": AdvanceDirective,
        "DiagnosticReport": DiagnosticReport,
        "DocumentReference": AdvanceDirective,
        "Encounter": Encounter,
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
        "Social History": SocialHistory,
        "Advance Directives": AdvanceDirective
    };

    const ipsDispatch = createEventDispatcher<{ 'ips-retrieved': IPSRetrieveEvent }>();
    const statusDispatch = createEventDispatcher<{ 'status-update': string }>();
    const errorDispatch = createEventDispatcher<{ 'error': string }>();
    let reference: string;
    let patientBadgeColor: string = "danger";

    // let resourcesByType: Record<string, Record<string, ResourceHelper>>;
    let selectedPatient: string=$resourceStore.selectedPatient;

    $: {
        if (submitting) {
            confirm().catch(error => {
                submitting = false;
                console.error(error);
                errorDispatch("error", error.message);
            });
        }
    }
    $: patientBadgeColor = Object.values(patients).length > 1 ? "danger" : "secondary";
    // $: resourcesByType = $resourceStore.getResourcesByType();
    $: patients = $resourceStore.resourcesByType['Patient'] ?? [];
    $: {
        if (selectedPatient) {
            $resourceStore.setSelectedPatient(selectedPatient);
            selectedPatient = $resourceStore.selectedPatient;
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
            let selectedResources = $resourceStore.getSelectedResources().map((rh:ResourceHelper) => {
                return rh.resource;
            });
            reference = await uploadResources(selectedResources);
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
            extensionStores.forEach(($extensionStore) => {
                content = $extensionStore.extendIPS(content);
            });
        }
        content.entry.map(entry => {
            if (entry.resource.extension) {
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
        submitting = false;
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
</script>
<AccordionItem active class="edit-data">
    <h5 slot="header" class="my-2">4. Directly edit your health summary content</h5>
    <Label>Select which resources to include in your customized IPS</Label>
    <Accordion>
        {#if Object.keys($resourceStore.resourcesByType).length > 0}
            {#each Object.keys($resourceStore.resourcesByType) as resourceType}
                <AccordionItem on:toggle={() => updateBadge(resourceType)}>
                    <span slot="header">
                        {#if resourceType === "Patient"}
                            Patients
                            <Badge
                                positioned
                                class="mx-1"
                                color={patientBadgeColor}
                            >
                                {Object.values(patients).length}
                            </Badge>
                        {:else}
                            {`${resourceType}s`}
                            <Badge
                                positioned
                                class="mx-1"
                                color={
                                    Object.values($resourceStore.resourcesByType[resourceType])
                                        .filter(resource => resource.include).length
                                        == Object.keys($resourceStore.resourcesByType[resourceType]).length
                                        ? "primary"
                                        : Object.values($resourceStore.resourcesByType[resourceType])
                                            .filter(resource => resource.include).length
                                            == Object.keys($resourceStore.resourcesByType[resourceType]).length
                                            ? "primary"
                                            : Object.values($resourceStore.resourcesByType[resourceType])
                                                .filter(resource => resource.include).length
                                                > 0
                                                ? "info"
                                                : "secondary"
                                }>
                                {Object.values($resourceStore.resourcesByType[resourceType]).filter(resource => resource.include).length}
                            </Badge>
                        {/if}
                    </span>
                    <FormGroup>
                        {#each Object.keys($resourceStore.resourcesByType[resourceType]) as key}
                            <Label style="width: 100%">
                                <Card style="width: 100%; max-width: 100%">
                                    <CardHeader>
                                        <span style="font-size:small">{resourceType}</span>
                                    </CardHeader>
                                    <CardBody>
                                        <Row>
                                            <Col xs=auto style="vertical-align:baseline">
                                                {#if resourceType === "Patient"}
                                                    <Input id={key} type="radio" bind:group={selectedPatient} value={key} />
                                                {:else}
                                                    <Input id={key} type="checkbox" bind:checked={$resourceStore.resourcesByType[resourceType][key].include} value={key} />
                                                {/if}
                                            </Col>
                                            <Col>
                                                {#if resourceType in components}
                                                    <svelte:component this={components[resourceType]} resource={$resourceStore.resourcesByType[resourceType][key].resource} />
                                                    <!-- ResourceType: {resourceType}
                                                    Resource: {JSON.stringify($resourceStore.resourcesByType[resourceType][key].resource)} -->
                                                {:else if $resourceStore.resourcesByType[resourceType][key].resource.text?.div}
                                                    {@html $resourceStore.resourcesByType[resourceType][key].resource.text?.div}
                                                {:else}
                                                    {$resourceStore.resourcesByType[resourceType][key].tempId}
                                                {/if}
                                            </Col>
                                        </Row>
                                    </CardBody>
                                </Card>
                            </Label>
                        {/each}
                    </FormGroup>
                </AccordionItem>
            {/each}
        {/if}
        {#if extensionStores}
            {#each extensionStores as $extensionStore}
                {#if $extensionStore.resources > 0}
                    <AccordionItem on:toggle={() => updateBadge($extensionStore.getName())}>
                        <span slot="header">
                                {$extensionStore.getName()}
                                <Badge
                                    class="mx-1"
                                    color={
                                        Object.keys($extensionStore.getSelectedResources()).length
                                            == $extensionStore.getResourceCount()
                                            ? "primary"
                                            : Object.keys($extensionStore.getSelectedResources()).length
                                                > 0
                                                ? "info"
                                                : "secondary"
                                    }>
                                    {Object.keys($extensionStore.getSelectedResources()).length}
                                </Badge>
                        </span>
                        <FormGroup>
                            {#if $extensionStore.getResourceCount() > 0}
                                {#each Object.keys($extensionStore.getResources()) as key}
                                    <Label style="width: 100%">
                                        <Card style="width: 100%; max-width: 100%">
                                            <CardHeader>
                                                <span style="font-size:small">{$extensionStore.getName()}</span>
                                            </CardHeader>
                                            <CardBody style="overflow:hidden">
                                                <Row class="flex-nowrap">
                                                    <Col xs=auto style="vertical-align:baseline">
                                                        <Input
                                                            id={key}
                                                            type="checkbox"
                                                            bind:checked={$extensionStore.resources[key].include}
                                                            value={key}
                                                            />
                                                    </Col>
                                                    <Col>
                                                        {#if $extensionStore.getName() in components}
                                                            <svelte:component this={components[$extensionStore.getName()]} resource={$extensionStore.getResources()[key].resource} />
                                                        {:else if $extensionStore.getResources()[key].resource.text?.div}
                                                            {@html $extensionStore.getResources()[key].resource.text?.div}
                                                        {:else}
                                                            {$extensionStore.getResources()[key].tempId}
                                                        {/if}
                                                    </Col>
                                                </Row>
                                            </CardBody>
                                        </Card>
                                    </Label>
                                {/each}
                            {/if}
                        </FormGroup>
                    </AccordionItem>
                {/if}
            {/each}
        {/if}
    </Accordion>
</AccordionItem>

