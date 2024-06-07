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
    import { ResourceHelper, type IPSRetrieveEvent } from './types';

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
    import Problem from './resource-templates/Problem.svelte';
    import Procedure from './resource-templates/Procedure.svelte';
    import SocialHistory from './resource-templates/SocialHistory.svelte';

    export let newResources: Array<any> | undefined;
    export let submitting: boolean;
    export let patient: any | undefined;
    export let injectedResources: Record<string, {section: any|undefined; resources: { [key: string]: ResourceHelper }}>;

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
        "Problem": Problem,
        "Procedure": Procedure,
        "Social History": SocialHistory,
        "Advance Directives": AdvanceDirective
    };

    const ipsDispatch = createEventDispatcher<{ 'ips-retrieved': IPSRetrieveEvent }>();
    const statusDispatch = createEventDispatcher<{ 'status-update': string }>();
    const errorDispatch = createEventDispatcher<{ 'error': string }>();
    let resources:{ [key: string]: ResourceHelper } = {};
    let resourcesByType:{ [key: string]: { [key: string]: ResourceHelper} } = {};
    let reference: string;
    let patientReference: string;
    let patients: {[key: string]: ResourceHelper} = {};
    let selectedPatient: string;
    let patientBadgeColor: string = "danger";

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
        if (submitting) {
            confirm().catch(error => {
                submitting = false;
                console.error(error);
                errorDispatch("error", error.message);
            });
        }
    }
    $: patientBadgeColor = Object.values(patients).length > 1 ? "danger" : "secondary";

    /**
     * Adds a resource to the storage of resources. If the resource already exists in the storage, it will not be added again.
     * @param resource The resource to add.
     * @param resourceHelperStorage The storage object to add the resource to.
     */
    function addResource(resource:ResourceHelper, resourceHelperStorage:{[key:string]: ResourceHelper}) {
        if (!(resource.tempId in resourceHelperStorage)) {
            resourceHelperStorage[resource.tempId] = resource;
            if (!(resource.resource.resourceType in resourcesByType)) {
                resourcesByType[resource.resource.resourceType] = {};
            }
            resourcesByType[resource.resource.resourceType][resource.tempId] = resource;
        }
    }

    /**
     * Adds a list of resources to the storage of resources. If a resource already exists in the storage, it will not be added again.
     * @param resources The list of resources to add.
     * @param resourceHelperStorage The storage object to add the resources to.
     */
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

    /**
     * Updates the selected patient with the new patient resource.
     * @param newPatient The new patient resource.
     */
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

    /**
     * Sets the patient reference on each resource in the list of resources.
     * @param resources The list of resources to set the patient references on.
     * @returns The list of resources with the patient references set.
     */
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

    /**
     * Gets the list of resources that are selected for upload.
     * @returns The list of selected resources.
     */
    function getSelectedResources() {
        let selectedPatient = Object.values(patients).filter(patient => patient.include);
        let selectedResources = Object.values(resources).filter(resource => resource.include);
        return selectedPatient.concat(selectedResources);
    }

    /**
     * Compares two resources and sorts them by resourceType, if the resourceType is the same, it will compare the occurrenceDateTime and vaccineCode.text
     * @param a The first resource to compare.
     * @param b The second resource to compare.
     * @returns -1 if a is less than b, 1 if a is greater than b, and 0 if they are the same.
     */
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

    /**
     * Updates the {@link newResources} array with the combined resources of all patients and non-patient resources.
     * This is used to generate the bundle to be exported.
     */
    function updateResourceExports() {
        newResources = Object.values(patients).map(rh => rh.resource).concat(Object.values(resources).map(rh => rh.resource));
    }

    /**
     * Adds the new resources to the combined resources of all patients and non-patient resources.
     * This is used to generate the bundle to be exported.
     * @param newResources The new resources to add.
     */
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
            updateBadge('Patient', "danger");
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

    /**
     * Sets the patient reference on each resource in the list of resources and returns the list of resources.
     * @param resources The list of resources to set the patient references on.
     * @returns The list of resources with the patient references set.
     */
    function prepareResources(resources:ResourceHelper[]) {
        resources = setPatientRefs(resources);
        return resources.map(rh => {
            return rh.resource;
        });
    }

    /**
     * Confirms the IPS content, then uploads the selected resources,
     * fetches the IPS, and calls the event dispatcher to pass the IPS to the parent component.
     */
    async function confirm() {
        submitting = true;
        statusDispatch("status-update", "Preparing");
        let preparedResources = prepareResources(getSelectedResources());
        statusDispatch("status-update", "Adding data");
        try {
            reference = await uploadResources(preparedResources);
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
        if (content && injectedResources) {
            Object.keys(injectedResources).forEach((section) => {
                if (injectedResources[section].section) {
                    injectedResources[section].section.entry = [];
                    let rkeys = Object.keys(injectedResources[section].resources);
                    let sectionToUse = injectedResources[section].section;
                    let injectingSectionIntoComposition = true;
                    content.entry[0].resource.section.forEach(section => {
                        if (section.code.coding[0].code === sectionToUse.code.coding[0].code) {
                            sectionToUse = section;
                            injectingSectionIntoComposition = false;
                        }
                    });

                    for (let i=0; i < rkeys.length; i++) {
                        if (injectedResources[section].resources[rkeys[i]].include) {
                            let entry = {
                                resource: injectedResources[section].resources[rkeys[i]].resource,
                                fullUrl: `urn:uuid:${injectedResources[section].resources[rkeys[i]].resource.id}`
                            }
                            content.entry.push(entry);
                            sectionToUse.entry.push({
                                reference: `${entry.fullUrl}`
                            });
                        }
                    }
                    if (injectingSectionIntoComposition) {
                        content.entry[0].resource.section.push(sectionToUse);
                    }
                }
            })
        }
        content.entry.map(entry => {
            if (entry.resource.extension) {
                entry.resource.extension = entry.resource.extension.filter(function(item) {
                    return item.url !== "http://hl7.org/fhir/StructureDefinition/narrativeLink";
                })
                if (entry.resource.extension.length === 0) {
                    delete entry.resource.extension
                }
            }
            return entry;
        })
        ipsDispatch('ips-retrieved', { ips: content });
        submitting = false;
    }
    function updateBadge(type: string, color="") {
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
    <h5 slot="header" class="my-2">3. Directly edit your health summary content</h5>
    <Label>Select which resources to include in your customized IPS</Label>
    <Accordion>
        {#if Object.keys(resourcesByType).length > 0}
            {#each Object.keys(resourcesByType) as resourceType}
                <AccordionItem on:toggle={updateBadge(resourceType)}>
                    <span slot="header">
                        {#if resourceType === "Patient"}
                            Patients <Badge color={patientBadgeColor}>{Object.values(patients).length}</Badge>
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
                                                    <Input id={key} type="checkbox" bind:checked={resourcesByType[resourceType][key].include} value={key} />
                                                {/if}
                                            </Col>
                                            <Col>
                                                {#if resourceType in components}
                                                    <svelte:component this={components[resourceType]} resource={resourcesByType[resourceType][key].resource} />
                                                    <!-- ResourceType: {resourceType}
                                                    Resource: {JSON.stringify(resourcesByType[resourceType][key].resource)} -->
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
            {/each}
        {/if}
        {#if injectedResources}
            {#each Object.keys(injectedResources) as section}
                <AccordionItem on:toggle={updateBadge(section)}>
                    <span slot="header">
                            {section}
                            <Badge
                                class="mx-1"
                                color={
                                    Object.values(injectedResources[section].resources)
                                        .filter(resource => resource.include).length
                                        == Object.keys(injectedResources[section].resources).length
                                        ? "primary"
                                        : Object.values(injectedResources[section].resources)
                                            .filter(resource => resource.include).length
                                            > 0
                                            ? "info"
                                            : "secondary"
                                }>
                                {Object.values(injectedResources[section].resources).filter(resource => resource.include).length}
                            </Badge>
                    </span>
                    <FormGroup>
                        {#if injectedResources[section].resources}
                            {#each Object.keys(injectedResources[section].resources) as key}
                                <Label style="width: 100%">
                                    <Card style="width: 100%; max-width: 100%">
                                        <CardHeader>
                                            <span style="font-size:small">{section}</span>
                                        </CardHeader>
                                        <CardBody style="overflow:hidden">
                                            <Row class="flex-nowrap">
                                                <Col xs=auto style="vertical-align:baseline">
                                                    <Input
                                                        id={key}
                                                        type="checkbox" bind:checked={injectedResources[section].resources[key].include}
                                                        value={key}
                                                        />
                                                </Col>
                                                <Col>
                                                    {#if section in components}
                                                        <svelte:component this={components[section]} resource={injectedResources[section].resources[key].resource} />
                                                    {:else if injectedResources[section].resources[key].resource.text?.div}
                                                        {@html injectedResources[section].resources[key].resource.text?.div}
                                                    {:else}
                                                        {injectedResources[section].resources[key].tempId}
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
            {/each}
        {/if}
    </Accordion>
</AccordionItem>

