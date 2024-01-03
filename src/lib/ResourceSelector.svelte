<script lang='ts'>
    import { uploadResources, checkResource } from './resourceUploader.js';
    import { createEventDispatcher } from 'svelte';
    import {
        Accordion,
        AccordionItem,
        Button,
        Col,
        Row,
        Spinner } from 'sveltestrap';
    import { ResourceHelper, type IPSRetrieveEvent } from './types';

    export let newResources: Array<any> | undefined;

    const ipsDispatch = createEventDispatcher<{ 'ips-retrieved': IPSRetrieveEvent }>();
    let resources:{ [key: string]: ResourceHelper } = {};
    let submitting = false;
    let reference: string;
    let patientReference: string;
    let patients: {[key: string]: ResourceHelper} = {};

    // This function will be executed when the resource list is updated
    $: {
        if (newResources) {
            addNewResources(newResources);
        }
    };

    function addResource(resource:ResourceHelper, resourceList:{[key:string]: ResourceHelper}) {
        if (!(resource.tempId in resourceList)) {
            resourceList[resource.tempId] = resource;
        }
    }

    function addResources(resources:ResourceHelper[] | undefined, resourceList:{[key:string]: ResourceHelper}) {
        if (resources != undefined) {
            let allResources = Object.values(resourceList).concat(resources).sort(sortResources);
            for (var key in resourceList){
                if (resourceList.hasOwnProperty(key)){
                    delete resourceList[key];
                }
            }
            allResources.forEach(resource => {
                addResource(resource, resourceList);
            });
        }
    }

    function updatePatient(patient:ResourceHelper) {
        if (patients[patient.tempId] == undefined) {
            patients[patient.tempId] = patient;
        }
        Object.keys(patients).forEach(key => {
            patients[key].include = (key == patient.tempId);
        });
        patientReference = `Patient/${patient.resource.id}`;
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

            let newPatients = newResources.filter(rh => rh.resource.resourceType == "Patient");
            addResources(newPatients, patients);
            patients = patients;
            if (!patientReference) {
                if (newPatients.length > 0) {
                    updatePatient(newPatients[0]);
                } else {
                    throw Error("Missing valid patient resource");
                }
            }
            newResources = newResources.filter(rh => {
                return rh.resource.resourceType != "Patient"
            });
            addResources(newResources, resources);
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

<form on:submit|preventDefault={() => confirm()}>
    <Accordion>
        <AccordionItem header="Customize IPS Content">
        {#if resources != null}
            <p>Select resources from the list below to include in a new customized Summary:</p>
            {#each Object.keys(resources) as key}
                <div class="resource form-check">
                    <input id={key} class="form-check-input" type="checkbox" bind:checked={resources[key].include} value={key}/>
                    <label class="form-check-label" style="width:100%" for={key}><p style="overflow-wrap:break-word">{@html JSON.stringify(resources[key].original_resource)}</p></label>
                </div>
            {/each}
        {/if}
    </AccordionItem>
</Accordion>
    <br/>
    <Row>
        <Col xs="auto">
        <Button color="primary" style="width:fit-content" disabled={submitting} type="submit">
            {#if !submitting}
            Submit Custom IPS
            {:else}
            Submitting IPS...
            {/if}
        </Button>
        </Col>
        {#if submitting}
        <Col xs="auto">
        <Spinner color="primary" type="border" size="md"/>
        </Col>
        {/if}
    </Row>
    <br/>
</form>
