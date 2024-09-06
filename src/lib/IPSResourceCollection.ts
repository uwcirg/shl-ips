/**
 * IPSResourceStage is a class that contains the logic for preparing
 * resources for an IPS. It is responsible for loading resources
 * and ensuring that the resources are valid and suitable
 * for inclusion in an IPS bundle.
 */

import { ResourceHelper } from "./ResourceHelper";
import type { Resource, Bundle } from "fhir/r4";

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

export interface IPSResourceCollectionInterface {
    resources: { [key: string]: ResourceHelper };
    resourcesByType: { [key: string]: { [key: string]: ResourceHelper} };
    patients: {[key: string]: ResourceHelper};
    selectedPatient: string;
    patientReference: string;
}

export class IPSResourceCollection implements IPSResourceCollectionInterface {
    resources: { [key: string]: ResourceHelper } = {};
    resourcesByType: { [key: string]: { [key: string]: ResourceHelper} } = {};
    patients: {[key: string]: ResourceHelper} = {};
    selectedPatient: string = "";
    patientReference: string = "";

    constructor();
    constructor(r: Resource);
    constructor(r: Resource[]);
    constructor(r: Resource | Resource[] | null = null) {
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
        let ids = Object.keys(this.resources);
        for (let i=0; i < ids.length; i++) {
            let id = ids[i];
            if (this.resources[id].resource.subject) {
                this.resources[id].resource.subject = this.patientReference;
            } else if (this.resources[id].resource.patient) {
                this.resources[id].resource.patient = this.patientReference;
            }
        };
    }

    /**
     * Adds a resource to a resource list. If the resource already
     * exists in the list, it will not be added again.
     * @param resource The resource to add.
     */
    addResource(resource: Resource) {
        let rh = new ResourceHelper(resource);
        let storage = resource.resourceType == 'Patient' ? this.patients : this.resources;
        if (!(rh.tempId in storage)) {
            storage[rh.tempId] = rh;
            if (!(rh.resource.resourceType in this.resourcesByType)) {
                this.resourcesByType[rh.resource.resourceType] = {};
            }
            this.resourcesByType[rh.resource.resourceType][rh.tempId] = rh;

            if (rh.resource.resourceType == 'Patient' && !this.patientReference) {
                this.selectedPatient = rh.tempId;
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
        if (this.patients[p] == undefined) {
            return;
        }
        this.selectedPatient = p;
        this.patientReference = `Patient/${this.patients[this.selectedPatient].resource.id}`;
        this._updatePatientRefs();
    }

    /**
     * Gets the list of resources that are selected for upload.
     * @returns The list of selected resources.
     */
    getSelectedResources() {
        let selectedPatient = Object.values(this.patients).filter(patient => patient.include);
        let selectedResources = Object.values(this.resources).filter(resource => resource.include);
        return selectedPatient.concat(selectedResources);
    }
}