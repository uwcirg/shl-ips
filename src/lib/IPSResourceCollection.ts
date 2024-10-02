/**
 * IPSResourceStage is a class that contains the logic for preparing
 * resources for an IPS. It is responsible for loading resources
 * and ensuring that the resources are valid and suitable
 * for inclusion in an IPS bundle.
 */

import { ResourceHelper } from "./ResourceHelper";
import type { Resource, Bundle } from "fhir/r4";
import { writable, derived, get, type Writable, type Readable, type Updater } from "svelte/store";

// This is both allowable and reverse order of loading
const allowableResourceTypes = [
    'AllergyIntolerance',
    // 'CarePlan', Still needs some work for referential integrity
    'Consent',
    'Condition',
    'ClinicalImpression',
    'Device',
    'DeviceUseStatement',
    'DiagnosticReport',
    'DocumentReference',
    'Encounter',
    'Immunization',
    'Location',
    'Media',
    'Medication',
    'MedicationRequest',
    'MedicationStatement',
    'Observation',
    'Organization',
    // 'Patient', // This is loaded separately
    'Practitioner',
    // 'PractitionerRole', Not relevant to IPS
    'Procedure',
    'Specimen'
];

export class IPSResourceCollection {
    resources: Writable<Record<string, ResourceHelper>>;
    resourcesByType: Writable<Record<string, Record<string, ResourceHelper>>>;
    patients: Writable<Record<string, ResourceHelper>>;
    selectedPatient: Writable<string>;
    patientReference: Readable<string>;

    constructor();
    constructor(r: Resource | Resource[] | null);
    constructor(r: Resource | Resource[] | null = null) {
        this.resourcesByType = writable({} as Record<string, Record<string, ResourceHelper>>);
        this.resources = {
            ...(derived(this.resourcesByType, ($resourcesByType:Record<string, Record<string, ResourceHelper>>) => {
                let resources = Object.values($resourcesByType).reduce(
                    (acc, cur) => {
                        return Object.assign(acc, cur);
                    },
                    {}
                );
                return resources;
            })),
            set: (newStoreValue:Record<string, ResourceHelper>) => {
                let obj = {} as Record<string, Record<string, ResourceHelper>>;
                Object.values(newStoreValue).forEach((rh:ResourceHelper) => {
                    if (!(rh.resource.resourceType in obj)) {
                        obj[rh.resource.resourceType] = {} as Record<string, ResourceHelper>;
                    }
                    obj[rh.resource.resourceType][rh.tempId] = rh;
                });
                this.resourcesByType.set(obj);
            },
            update(u:Updater<Record<string, ResourceHelper>>) { return this.set(u(get(this))) }
        };
        this.patients = writable({} as Record<string, ResourceHelper>);
        this.selectedPatient = writable('');
        this.patientReference = derived(this.selectedPatient, ($selectedPatient) => {
            if ($selectedPatient) {
                return `Patient/${get(this.patients)[$selectedPatient].resource.id}`;
            } else {
                return '';
            }
        });
        if (r) {
            if (Array.isArray(r)) {
                this.addResources(r);
            } else {
                this.addResource(r);
            }
        }
    }

    /**
     * Validates a resource or bundle and returns the resource if valid.
     *
     * @param {Resource | Bundle} data - The resource or bundle to validate.
     * @return {Resource | null} The valid resource if it exists, otherwise null.
     */
    _validateResource(data: Resource | Bundle) {
        if (data.resourceType && allowableResourceTypes.includes(data.resourceType)) {
            return true;
        } else if (data.resourceType === 'Patient') {
            return true;
        } else if (data.resourceType && data.resourceType === 'Bundle') {
            return false;
        } else {
            console.log(`skipping ${data.resourceType}`);
            return false;
        }
    }

    /**
     * Sets the patient reference on each resource in the list of resources.
     * @param resources The list of resources to set the patient references on.
     * @returns The list of resources with the patient references set.
    */
    _updatePatientRefs() {
        this.resourcesByType.update((currState:Record<string, Record<string, ResourceHelper>>) => {
            let newPatientRef = get(this.patientReference);
            let newState = {} as Record<string, Record<string, ResourceHelper>>;
            let types = Object.keys(currState);
            for (let i=0; i<types.length; i++) {
                let type = types[i];
                let ids = Object.keys(currState[type]);
                for (let j=0; j<ids.length; j++) {
                    let id = ids[j];
                    let newVal = currState[type][id];
                    if (newVal.resource.subject) {
                        newVal.resource.subject = newPatientRef;
                    } else if (newVal.resource.patient) {
                        newVal.resource.patient = newPatientRef;
                    }
                    if (newState[type] === undefined) {
                        newState[type] = {};
                    }
                    newState[type][id] = newVal;
                }
            }
            return newState;
        });
    }

    /**
     * Adds a resource to a resource list. If the resource already
     * exists in the list, it will not be added again.
     * @param resource The resource to add.
     */
    addResource(resource: Resource) {
        let rh = new ResourceHelper(resource);
        let storage:Writable<Record<string, ResourceHelper>> = (resource.resourceType == 'Patient' ? this.patients : this.resources);
        if (!(rh.tempId in get(storage))) {
            storage.update((v:Record<string, ResourceHelper>) => {
                v[rh.tempId] = rh;
                return v;
            });
            if (!(rh.resource.resourceType in this.resourcesByType)) {
                this.resourcesByType[rh.resource.resourceType] = {};
            }
            this.resourcesByType[rh.resource.resourceType][rh.tempId] = rh;

            if (rh.resource.resourceType == 'Patient' && !get(this.patientReference)) {
                this.setSelectedPatient(rh.tempId);
            }
        }
    }

    /**
     * Adds a list of resources to the resource list. If a resource already
     * exists in the list, it will not be added again.
     * @param resources The list of resources to add.
     */
    addResources(resources:Resource[]) {
        resources = resources.filter(r => {
            if (!this._validateResource(r)) {
                console.warn("Invalid resource: " + JSON.stringify(r));
                return false;
            }
            return true;
        });
        resources.forEach(r => this.addResource(r));
        let sp = get(this.selectedPatient);
        if (sp) {
            this.setSelectedPatient(sp);
        } else {
            this.setSelectedPatient(Object.keys(get(this.patients))[0]);
        }
        // TODO: Test if this triggers reactive updates
        // let newAndOldResources = Object.values(resourceHelperStorage).concat(resources).sort(sortResources);

        // // Refresh the RH storage object, deleting the current key/values and re-adding the full set.
        // for (var key in resourceHelperStorage){
        //     if (resourceHelperStorage.hasOwnProperty(key)){
        //         delete resourceHelperStorage[key];
        //     }
        // }
        // newAndOldResources.forEach(resource => {
        //     this.addResource(resource, resourceHelperStorage);
        // });
    }

    setSelectedPatient(p: string) {
        if (get(this.patients)[p] == undefined) {
            return;
        }
        this.selectedPatient.set(p);
        this._updatePatientRefs();
    }

    getResourcesByType() {
        return this.resourcesByType;
    }

    getSelectedPatient() {
        return get(this.patients)[get(this.selectedPatient)];
    }

    /**
     * Gets the list of resources that are selected for upload.
     * @returns The list of selected resources.
     */
    getSelectedResources(): ResourceHelper[] {
        let selectedPatient = Object.values(get(this.patients)).filter((patient) => { return (patient as ResourceHelper).include }) as ResourceHelper[];
        let selectedResources = Object.values(get(this.resources)).filter((resource) => { return (resource as ResourceHelper).include }) as ResourceHelper[];
        return selectedPatient.concat(selectedResources);
    }
}