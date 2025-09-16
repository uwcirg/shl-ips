/**
 * IPSResourceStage is a class that contains the logic for preparing
 * resources for an IPS. It is responsible for loading resources
 * and ensuring that the resources are valid and suitable
 * for inclusion in an IPS bundle.
 */

import { ResourceHelper } from "$lib/utils/ResourceHelper";
import type { Resource, Bundle, Composition,CompositionSection, FhirResource } from "fhir/r4";
import { derived, writable, get, type Writable, type Readable } from "svelte/store";
import type { CategorizedResourceHelperMap } from "$lib/types";
import { ResourceCollection, SerializedResourceCollection } from "$lib/utils/ResourceCollection";
import { ResourceHelperMap } from "./types";

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
    'Goal',
    'Flag',
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
    'QuestionnaireResponse', // FIXME this is not part of IPS, should get a carve-out elsewhere...
    'Specimen',
    
    // CARIN BB resources
    'Coverage',
    'Practitioner',
    'Organization',
    'RelatedPerson',
    'ExplanationOfBenefit',
];

export interface SerializedIPSResourceCollection extends SerializedResourceCollection {
    extensionSections: Record<string, CompositionSection|false>;
}

export class IPSResourceCollection {
    collection: ResourceCollection;
    selectedPatient: Readable<string>;
    patientReference: Readable<string>;
    resourcesByType: Readable<CategorizedResourceHelperMap>;
    extensionSections: Writable<Record<string, CompositionSection|false>>;

    constructor();
    constructor(r: Resource | Resource[] | null);
    constructor(r: Resource | Resource[] | null = null) {
        this.collection = new ResourceCollection(r);
        this.extensionSections = writable({});
        this.resourcesByType = derived(this.collection.resources, ($resources) => {
            let resourcesByType: Record<string, ResourceHelperMap> = {};
            for (const rh of Object.values($resources) as ResourceHelper[]) {
                if (!(rh.resourceType in resourcesByType)) {
                    resourcesByType[rh.resourceType] = {};
                }
                resourcesByType[rh.resourceType][rh.tempId] = rh;
            }
            return resourcesByType;
        });
        this.selectedPatient = derived(this.collection.selectedPatient, ($selectedPatient) => $selectedPatient);
        this.patientReference = derived(this.collection.patientReference, ($patientReference) => $patientReference);
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

    addSection(sectionKey: string, sectionTemplate?: CompositionSection) {
        this.extensionSections.update((curr) => {
            if (sectionTemplate) {
                curr[sectionKey] = sectionTemplate;
            } else {
                curr[sectionKey] = false;
            }
            return curr;
        });
    }

    /**
     * Adds a resource to a resource list. If the resource already
     * exists in the list, it will not be added again.
     * @param resource The resource to add.
     */
    addResource(resource: Resource, sectionKey?: string) {
        this.collection.addResource(resource, sectionKey);
    }

    /**
     * Adds a list of resources to the resource list. If a resource already
     * exists in the list, it will not be added again.
     * @param resources The list of resources to add.
     */

    // May want to add signature accepting a sectionKey function to handle more complex cases
    addResources(resources:Resource[], sectionKey?: string) {
        resources = resources.filter(r => {
            if (!this._validateResource(r)) {
                console.warn("Invalid IPS resource: " + JSON.stringify(r));
                return false;
            }
            return true;
        });
        resources.forEach(r => this.addResource(r, sectionKey));
    }

    extendIPS(ips: Bundle) {
        if (ips.entry === undefined || !ips.entry[0] || ips.entry[0].resource?.resourceType !== "Composition") {
            throw Error("IPS does not contain a Composition resource");
        }
        
        let composition = ips.entry[0].resource as Composition;
        const extensionSections = get(this.extensionSections);
        Object.keys(extensionSections).forEach((key) => {
            let sectionToUse = extensionSections[key];
            if (!sectionToUse) {
                return;
            }
            let addingNewSection = true;
            if (composition?.section) {
                composition.section.forEach(section => {
                    if (sectionToUse && section?.code?.coding?.[0].code === sectionToUse?.code?.coding?.[0]?.code) {
                        sectionToUse = section;
                        addingNewSection = false;
                    }
                });
            }
            sectionToUse.entry = sectionToUse.entry ?? [];
            // let sectionResources = Object.values(get(this.resourcesByType)[key]);
            let sectionResources = get(this.collection.categories)[key]
                .map(tempId => get(this.collection.resources)[tempId])
                .filter(rh => rh.include);
            sectionResources.forEach((rh:ResourceHelper) => {
                let entry = {
                    resource: rh.resource as FhirResource,
                    fullUrl: `urn:uuid:${rh.resource.id}`
                }
                let entryReference = {
                    reference: `${entry.fullUrl}`
                }
                ips.entry?.push(entry);
                sectionToUse.entry?.push(entryReference);
            });
            if (addingNewSection && sectionToUse.entry.length > 0) {
                composition.section?.push(sectionToUse);
            }
        });
        
        return ips;
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
    getSelectedIPSResources(): ResourceHelper[] {
        let rBT = get(this.resourcesByType);
        let extensionSections = get(this.extensionSections);
        Object.entries(extensionSections).forEach(([sectionKey, sectionTemplate]) => {
            // Exclude extensions from upload if attached to a custom section, but allow custom group titles w/o sections to be uploaded
            // **********
            // TODO: Removed to allow Advance Directives to be uploaded
            // if (sectionTemplate) {
            //     delete rBT[sectionKey];
            // }
        });
        let selectedIPSResources = this.flattenResources(rBT)
            .filter(resource => (resource as ResourceHelper).include ) as ResourceHelper[];
        return selectedIPSResources;
    }

    flattenResources(resourcesByType: Record<string, Record<string, ResourceHelper>>) {
        return Object.values(resourcesByType).flatMap(types => Object.values(types))
    }

    toJson(): string {
        let extensionSections = get(this.extensionSections);
        let serializedCollection = JSON.parse(this.collection.toJson());
        let output:SerializedIPSResourceCollection = {
            ...serializedCollection,
            extensionSections: extensionSections
        };
        return JSON.stringify(output);
    }

    static fromJson(json:string) {
        let data:SerializedIPSResourceCollection = JSON.parse(json);
        let { extensionSections, ...serializedCollection} = data;
        let IRC = new IPSResourceCollection(); 
        IRC.collection = ResourceCollection.fromJson(JSON.stringify(serializedCollection));
        if (extensionSections) {
            IRC.extensionSections.set(extensionSections);
        }
        return IRC;
    }

    clear() {
        this.resourcesByType.set({});
        this.extensionSections.set({});
        this.selectedPatient.set('');
    }
}
