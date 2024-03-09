<script lang='ts'>
    import { uploadResources, checkResource } from './resourceUploader.js';
    import { createEventDispatcher } from 'svelte';
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
    import AdvanceDirective from './resource-templates/AdvanceDirective.svelte';
    import AllergyIntolerance from './resource-templates/AllergyIntolerance.svelte';
    import Condition from './resource-templates/Condition.svelte';
    import DiagnosticReport from './resource-templates/DiagnosticReport.svelte';
    import Immunization from './resource-templates/Immunization.svelte';
    import Location from './resource-templates/Location.svelte';
    import Medication from './resource-templates/Medication.svelte';
    import MedicationRequest from './resource-templates/MedicationRequest.svelte';
    import MedicationStatement from './resource-templates/MedicationStatement.svelte';
    import Observation from './resource-templates/Observation.svelte';
    import Organization from './resource-templates/Organization.svelte';
    import Patient from './resource-templates/Patient.svelte';
    import Practitioner from './resource-templates/Practitioner.svelte';
    import Problem from './resource-templates/Problem.svelte';
    import Procedure from './resource-templates/Procedure.svelte';
    import { ResourceHelper, type IPSRetrieveEvent } from './types';

    export let newResources: Array<any> | undefined;
    export let submitSelections: boolean;
    export let patient: any | undefined;

    const components: Record<string, any> = {
        "DocumentReference": AdvanceDirective,
        "AllergyIntolerance": AllergyIntolerance,
        "Condition": Condition,
        "DiagnosticReport": DiagnosticReport,
        "Immunization": Immunization,
        "Location": Location,
        "Medication": Medication,
        "MedicationRequest": MedicationRequest,
        "MedicationStatement": MedicationStatement,
        "Observation": Observation,
        "Organization": Organization,
        "Patient": Patient,
        "Practitioner": Practitioner,
        "Problem": Problem,
        "Procedure": Procedure,
    };

    const ipsDispatch = createEventDispatcher<{ 'ips-retrieved': IPSRetrieveEvent }>();
    let resources:{ [key: string]: ResourceHelper } = {};
    let resourcesByType:{ [key: string]: { [key: string]: ResourceHelper} } = {};
    let submitting = false;
    let reference: string;
    let patientReference: string;
    let patients: {[key: string]: ResourceHelper} = {};
    let selectedPatient: string;

    // This function will be executed when the resource list is updated
    $: {
        if (newResources) {
            addNewResources(newResources);
        }
    };
    $: {
        if (selectedPatient) {
            updatePatient(patients[selectedPatient]);
        }
    }
    $: {
        if (submitSelections) {
            confirm();
        }
    }

    function addResource(resource:ResourceHelper, resourceHelperStorage:{[key:string]: ResourceHelper}) {
        if (!(resource.tempId in resourceHelperStorage)) {
            resourceHelperStorage[resource.tempId] = resource;
            if (!(resource.resource.resourceType in resourcesByType)) {
                resourcesByType[resource.resource.resourceType] = {};
            }
            resourcesByType[resource.resource.resourceType][resource.tempId] = resource;
        }
    }

    function addResources(resources:ResourceHelper[] | undefined, resourceHelperStorage:{[key:string]: ResourceHelper}) {
        if (resources != undefined) {
            let newAndOldResources = Object.values(resourceHelperStorage).concat(resources).sort(sortResources);

            // Refresh the RH storage object, deleting the current key/values and re-adding the full set.
            for (var key in resourceHelperStorage){
                if (resourceHelperStorage.hasOwnProperty(key)){
                    delete resourceHelperStorage[key];
                }
            }
            newAndOldResources.forEach(resource => {
                addResource(resource, resourceHelperStorage);
            });
        }
    }

    function updatePatient(newPatient:ResourceHelper) {
        if (patients[newPatient.tempId] == undefined) {
            patients[newPatient.tempId] = newPatient;
        }
        Object.keys(patients).forEach(key => {
            patients[key].include = (key == newPatient.tempId);
        });
        selectedPatient = newPatient.tempId;
        patient = newPatient.resource;
        patientReference = `Patient/${newPatient.resource.id}`;
    }

    function setPatientRefs(resources:ResourceHelper[]) {
        return resources.map(r => {
            if (r.resource.subject) {
                r.resource.subject.reference = patientReference;
            } else if (r.resource.patient) {
                r.resource.patient.reference = patientReference;
            }
            return r;
        });
    }

    function getSelectedResources() {
        let selectedPatient = Object.values(patients).filter(patient => patient.include);
        let selectedResources = Object.values(resources).filter(resource => resource.include);
        return selectedPatient.concat(selectedResources);
    }

    function sortResources(a:ResourceHelper, b:ResourceHelper) {
        let aR = a.resource;
        let bR = b.resource;
        // Compare 'resourceType' values
        const resourceTypeA = aR.resourceType.toUpperCase();
        const resourceTypeB = bR.resourceType.toUpperCase();
    
        if (resourceTypeA < resourceTypeB) {
            return -1;
        }
        if (resourceTypeA > resourceTypeB) {
            return 1;
        }

        if (resourceTypeA === "Immunization") {
            const occurrenceDateTimeA = aR.occurrenceDateTime;
            const occurrenceDateTimeB = bR.occurrenceDateTime;
        
            if (occurrenceDateTimeA < occurrenceDateTimeB) {
                return -1;
            }
            if (occurrenceDateTimeA > occurrenceDateTimeB) {
                return 1;
            }
            const vaccineCodetextA = aR.vaccineCode.text;
            const vaccineCodetextB = bR.vaccineCode.text;
        
            if (vaccineCodetextA < vaccineCodetextB) {
                return -1;
            }
            if (vaccineCodetextA > vaccineCodetextB) {
                return 1;
            }
        }
        return 0;
    }

    function updateResourceExports() {
        newResources = Object.values(patients).map(rh => rh.resource).concat(Object.values(resources).map(rh => rh.resource));
    }

    function addNewResources(newResources:any[]) {
        if (newResources) {
            newResources = newResources.filter(r => {
                if (checkResource(r) == null) {
                    // console.warn("Invalid resource: " + JSON.stringify(r));
                    return false;
                }
                return true;
            })
            newResources = newResources.map(resource => {
                return new ResourceHelper(resource);
            });

            let newPatients = newResources.filter(rh => rh.resource.resourceType === "Patient");
            addResources(newPatients, patients);
            patients = patients;
            if (!patientReference) {
                if (newPatients.length > 0) {
                    selectedPatient = newPatients[0].tempId;
                } else {
                    throw Error("Missing valid patient resource");
                }
            }
            let newNonPatients = newResources.filter(rh => rh.resource.resourceType !== "Patient");
            addResources(newNonPatients, resources);
            updateResourceExports();
            resources = resources;
            return;
        }
        return;
    }

    function prepareResources(resources:ResourceHelper[]) {
        resources = setPatientRefs(resources);
        return resources.map(rh => {
            return rh.resource;
        });
    }

    async function confirm() {
        submitting = true;
        let preparedResources = prepareResources(getSelectedResources());
        reference = await uploadResources(preparedResources);

        let content;
        const contentResponse = await fetch(reference!, {
            headers: { accept: 'application/fhir+json' }
        }).then(function(response) {
            if (!response.ok) {
                // make the promise be rejected if we didn't get a 2xx response
                throw new Error("Unable to fetch IPS", {cause: response});
            } else {
                return response;
            }
        });
        content = await contentResponse.json();
        ipsDispatch('ips-retrieved', { ips: content });
        submitting = false;
    }
</script>
<AccordionItem active class="edit-data">
    <h5 slot="header" class="my-2">3. Directly edit your health summary content</h5>
    <Label>Select which resources to include in your customized IPS</Label>
    <Accordion>
        {#each Object.keys(resourcesByType) as resourceType}
            {#if resourceType !== "Patient" || Object.keys(patients).length > 1}
                <AccordionItem>
                    <span slot="header">
                        {#if resourceType === "Patient"}
                            Select Patient Information <Badge color="secondary">{Object.values(patients).length}</Badge>
                        {:else}
                            {`${resourceType}s`}
                            <Badge
                                positioned
                                class="mx-1"
                                color={
                                    Object.values(resourcesByType[resourceType])
                                        .filter(resource => resource.include).length
                                        == Object.keys(resourcesByType[resourceType]).length
                                        ? "primary"
                                        : Object.values(resourcesByType[resourceType])
                                            .filter(resource => resource.include).length
                                            > 0
                                            ? "info"
                                            : "secondary"
                                }>
                                {Object.values(resourcesByType[resourceType]).filter(resource => resource.include).length}
                            </Badge>
                        {/if}
                    </span>
                    <FormGroup>
                        {#each Object.keys(resourcesByType[resourceType]) as key}
                            <Label data={resourcesByType[resourceType][key]?.tempId} style="width: 100%">
                                <Card>
                                    <CardHeader>
                                        <span style="font-size:small">{resourceType}</span>
                                    </CardHeader>
                                    <CardBody>
                                        <Row>
                                            <Col xs=auto style="vertical-align:baseline">
                                                {#if resourceType === "Patient"}
                                                    <Input id={key} type="radio" bind:group={selectedPatient} value={key} />
                                                {:else}
                                                    <Input id={key} type="checkbox" bind:checked={resourcesByType[resourceType][key].include} value={key} />
                                                {/if}
                                            </Col>
                                            <Col>
                                                {#if resourceType in components}
                                                    <svelte:component this={components[resourceType]} resource={resourcesByType[resourceType][key].resource} />
                                                {:else if resourcesByType[resourceType][key].resource.text?.div}
                                                    {@html resourcesByType[resourceType][key].resource.text?.div}
                                                {:else}
                                                    {resourcesByType[resourceType][key].tempId}
                                                {/if}
                                            </Col>
                                        </Row>
                                    </CardBody>
                                </Card>
                            </Label>
                        {/each}
                    </FormGroup>
                </AccordionItem>
            {/if}
        {/each}
    </Accordion>
</AccordionItem>
