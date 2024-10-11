/**
 * IPSResourceStage is a class that contains the logic for preparing
 * resources for an IPS. It is responsible for loading resources
 * and ensuring that the resources are valid and suitable
 * for inclusion in an IPS bundle.
 */

import { ResourceHelper } from "./ResourceHelper";
import type { Resource, Bundle, Composition,CompositionSection, FhirResource } from "fhir/r4";
import { writable, derived, get, type Writable, type Readable } from "svelte/store";

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

interface SerializedIPSResourceCollection {
    resourcesByType: Record<string, Record<string, ResourceHelper>>;
    extensionSections: Record<string, CompositionSection>;
}

export class IPSResourceCollection {
    resourcesByType: Writable<Record<string, Record<string, ResourceHelper>>>;
    selectedPatient: Writable<string>;
    patientReference: Readable<string>;
    extensionSections: Record<string, CompositionSection>;

    constructor();
    constructor(r: Resource | Resource[] | null);
    constructor(r: Resource | Resource[] | null = null) {
        this.resourcesByType = writable({} as Record<string, Record<string, ResourceHelper>>);
        this.selectedPatient = writable('');
        this.patientReference = derived(this.selectedPatient, ($selectedPatient) => {
            if ($selectedPatient) {
                let patients = get(this.resourcesByType)['Patient'];
                if (!patients) {
                    throw Error('No patients exist');
                }
                return `Patient/${patients[$selectedPatient].resource.id}`;
            } else {
                return '';
            }
        });
        this.extensionSections = {} as Record<string, CompositionSection>;
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
                        newVal.resource.subject.reference = newPatientRef;
                    } else if (newVal.resource.patient) {
                        newVal.resource.patient.reference = newPatientRef;
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
    addResource(resource: Resource, key?:string, sectionTemplate?:CompositionSection) {
        let rh = new ResourceHelper(resource);
        let sectionKey:string = key ?? resource.resourceType;
        if (sectionKey !== resource.resourceType) {
            // Custom section
            if (sectionTemplate) {
                this.extensionSections[sectionKey] = sectionTemplate;
            }
        }
        this.resourcesByType.update((curr) => {
            if (!(sectionKey in curr)) {
                curr[sectionKey] = {};
            }
            if (!(rh.tempId in curr[sectionKey])) {
                curr[sectionKey][rh.tempId] = rh;
                if (sectionKey == 'Patient' && !get(this.patientReference)) {
                    this.setSelectedPatient(rh.tempId);
                }
            }
            return curr;
        });
    }

    /**
     * Adds a list of resources to the resource list. If a resource already
     * exists in the list, it will not be added again.
     * @param resources The list of resources to add.
     */

    // May want to add signature accepting a sectionKey function to handle more complex cases
    addResources(resources:Resource[], sectionKey?:string, sectionTemplate?:CompositionSection) {
        resources = resources.filter(r => {
            if (!this._validateResource(r)) {
                console.warn("Invalid resource: " + JSON.stringify(r));
                return false;
            }
            return true;
        });
        resources.forEach(r => this.addResource(r, sectionKey, sectionTemplate));
        let sp = get(this.selectedPatient);
        if (sp) {
            this.setSelectedPatient(sp);
        } else {
            let patients = get(this.resourcesByType)['Patient'];
            if (!patients) {
                throw Error('No patients exist');
            }
            this.setSelectedPatient(Object.keys(patients)[0]);
        }
    }

    extendIPS(ips: Bundle) {
        if (ips.entry === undefined || !ips.entry[0] || ips.entry[0].resource?.resourceType !== "Composition") {
            throw Error("IPS does not contain a Composition resource");
        }
        
        let composition = ips.entry[0].resource as Composition;
        Object.keys(this.extensionSections).forEach((key) => {
            let sectionToUse = this.extensionSections[key];
            let addingNewSection = true;
            if (composition?.section) {
                composition.section.forEach(section => {
                    if (section?.code?.coding?.[0].code === this.section?.code?.coding?.[0]?.code) {
                        sectionToUse = section;
                        addingNewSection = false;
                    }
                });
            }
            
            if (sectionToUse.entry === undefined) {
                sectionToUse.entry = [];
            }
            Object.values(get(this.resourcesByType)[key]).forEach((rh:ResourceHelper) => {
                if (rh.include) {
                    let entry = {
                        resource: rh.resource as FhirResource,
                        fullUrl: `urn:uuid:${rh.resource.id}`
                    }
                    ips.entry?.push(entry);
                    sectionToUse.entry?.push({
                        reference: `${entry.fullUrl}`
                    });
                }
            });
            if (addingNewSection && sectionToUse.entry.length > 0) {
                composition.section?.push(sectionToUse);
            }
        });
        
        return ips;
    }

    setSelectedPatient(p: string) {
        if (!("Patient" in get(this.resourcesByType))) {
            throw Error('No patients exist');
        }
        this.selectedPatient.set(p);
        this._updatePatientRefs();
    }

    getResourcesByType() {
        return this.resourcesByType;
    }

    getSelectedPatient() {
        return get(this.resourcesByType)["Patient"][get(this.selectedPatient)];
    }

    /**
     * Gets the list of resources that are selected for upload.
     * @returns The list of selected resources.
     */
    getSelectedResources(): ResourceHelper[] {
        let selectedResources = Object.values(get(this.resourcesByType))
            .flatMap(types => Object.values(types))
            .filter(resource => (resource as ResourceHelper).include ) as ResourceHelper[];
        return selectedResources;
    }

    toJson() {
        let resourcesByType = get(this.resourcesByType);
        let extensionSections = this.extensionSections;
        return JSON.stringify({
            resources: resourcesByType,
            extensionSections: extensionSections
        });
    }

    static fromJson(json:string) {
        let data:SerializedIPSResourceCollection = JSON.parse(json);
        let IRC = new IPSResourceCollection();
        if (data.resourcesByType) {
            IRC.resourcesByType.set(data.resourcesByType);
        }
        if (data.extensionSections) {
            IRC.extensionSections = data.extensionSections;
        }
        return IRC;
    }
}