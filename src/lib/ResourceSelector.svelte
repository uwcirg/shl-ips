<script lang='ts'>
    import { uploadResources, checkResource } from './resourceUploaderTSWrapper';
    import { createEventDispatcher } from 'svelte';
    import {
        Button,
        Col,
        Input,
        Row,
        Spinner } from 'sveltestrap';
    import type { IPSRetrieveEvent } from './types';
    import Patient from './resource-templates/Patient.svelte';

    export let newResources: Array<any> | undefined;

    const ipsDispatch = createEventDispatcher<{ 'ips-retrieved': IPSRetrieveEvent }>();
    let resourceStates: { [key: string]: boolean } = {};
    let submitting = false;
    let reference: string;
    let patientReference: string;
    let patientResources: {[key: string]: boolean} = {};

    // This function will be executed when the resource list is updated
    $: {
        if (newResources) {
            addNewResources(newResources);
        }
    };

    function addResource(resource:any, resourceList:{ [key: string]: boolean }) {
        let key = JSON.stringify(resource);
        if (!(key in resourceList)) {
            resourceList[key] = true;
        }
    }

    function addResources(resources:any[] | undefined, resourceList=resourceStates) {
        if (resources != undefined) {
            resources.forEach(element => {
                addResource(element, resourceList);
            });
        }
    }

    function updatePatient(patient:any) {
        if (typeof patient != "string") {
            patient = JSON.stringify(patient);
        }
        Object.keys(patientResources).forEach(patientResource => {
            if (patientResource == patient) {
                patientResources[patient] = true;
            } else {
                patientResources[patientResource] = false;
            }
        });
        patientReference = `Patient/${patient.id}`;
    }

    function setPatientRefs(resources:any[]) {
        return resources.map(r => {
            if (r.subject) {
                r.subject.reference = patientReference;
            } else if (r.patient) {
                r.patient.reference = patientReference;
            }
        });
    }

    function getSelectedResources() {
        return Object.keys(resourceStates).filter(key => resourceStates[key]);
    }

    function addNewResources(newResources:any[]) {
        if (newResources) {
            // newResources = newResources.map(element => {
            //     if (typeof element == "string") {
            //         return JSON.parse(element);
            //     }
            //     return element;
            // });

            newResources = newResources.filter(r => {
                if (checkResource(r) == null) {
                    console.warn("Invalid resource: " + JSON.stringify(r));
                    return false;
                }
                return true;
            });
            let patients = newResources.filter(resource => resource.resourceType == "Patient");
            addResources(patients, patientResources);
            if (!patientReference && patients.length > 0) {
                updatePatient(patients[0]);
            }
            if (!patientReference) {
                throw Error("Missing valid patient resource");
            }
            newResources = newResources.filter(resource => resource.resourceType != "Patient")
                .sort((a, b) => {
                    // Compare 'resourceType' values
                    const resourceTypeA = a.resourceType.toUpperCase();
                    const resourceTypeB = b.resourceType.toUpperCase();
                
                    if (resourceTypeA < resourceTypeB) {
                        return -1;
                    }
                    if (resourceTypeA > resourceTypeB) {
                        return 1;
                    }

                    if (resourceTypeA === "Immunization") {
                        const occurrenceDateTimeA = a.occurrenceDateTime;
                        const occurrenceDateTimeB = b.occurrenceDateTime;
                    
                        if (occurrenceDateTimeA < occurrenceDateTimeB) {
                            return -1;
                        }
                        if (occurrenceDateTimeA > occurrenceDateTimeB) {
                            return 1;
                        }
                        const vaccineCodetextA = a.vaccineCode.text;
                        const vaccineCodetextB = b.vaccineCode.text;
                    
                        if (vaccineCodetextA < vaccineCodetextB) {
                            return -1;
                        }
                        if (vaccineCodetextA > vaccineCodetextB) {
                            return 1;
                        }
                    }
                    return 0;
                });
            addResources(newResources, resourceStates);
        }
    }

    function prepareResources(resources:any[], append=true) {
        resources = setPatientRefs(resources);
        return resources;
    }

    async function confirm() {
        let preparedResources = prepareResources(getSelectedResources(), false);
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
    }
</script>

<h2 style="border-bottom: 1px solid rgb(204, 204, 204);">Edit IPS Content</h2>
<form on:submit|preventDefault={() => confirm()}>
    {#if resourceStates != null}
        {#each Object.keys(resourceStates) as resource}
            <Input class="resource" type="checkbox" bind:checked={resourceStates[resource]} label={resource} value={resource}/>
            <br/>
        {/each}
    {/if}
    {#if reference}
    <p>{reference}</p>
    {/if}
    <Row>
        <Col xs="auto">
          <Button color="primary" style="width:fit-content" disabled={submitting} type="submit">
            {#if !submitting}
              Create IPS
            {:else}
              Creating IPS...
            {/if}
          </Button>
        </Col>
        {#if submitting}
        <Col xs="auto">
          <Spinner color="primary" type="border" size="md"/>
        </Col>
        {/if}
      </Row>
</form>