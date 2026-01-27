/**
 * IPSResourceStage is a class that contains the logic for preparing
 * resources for an IPS. It is responsible for loading resources
 * and ensuring that the resources are valid and suitable
 * for inclusion in an IPS bundle.
 */

import { ResourceHelper } from "$lib/utils/ResourceHelper";
import type { Resource, Bundle, Composition,CompositionSection, FhirResource } from "fhir/r4";
import { derived, writable, get, type Writable, type Readable } from "svelte/store";
import type { CategorizedResourceHelperMap, ResourceHelperMap } from "$lib/utils/types";
import { ResourceCollection, type SerializedResourceCollection } from "$lib/utils/ResourceCollection";
import { METHOD_SYSTEM, PLACEHOLDER_SYSTEM, IDENTIFIER_SYSTEM } from "$lib/config/config";
import { SectionExtenderRegistry, type SectionUpdates } from "$lib/utils/sectionExtenderUtils";
import { isIPSBundle } from "$lib/utils/util";

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
    extensionSections: Record<string, { section: CompositionSection|false, resources: string[] } >;
}

export class IPSResourceCollection extends ResourceCollection {
    public resourcesByType: Readable<CategorizedResourceHelperMap>;
    private sectionExtensionResources: Writable<Record<string, Set<string>>>;
    private sectionExtenderRegistry: SectionExtenderRegistry;

    constructor();
    constructor(r: Resource | Resource[] | null);
    constructor(r: Resource | Resource[] | null = null) {
        super(r);
        this.sectionExtenderRegistry = new SectionExtenderRegistry();
        this.sectionExtensionResources = writable({});
        this.resourcesByType = derived((this as ResourceCollection).resources, ($resources) => {
            let resourcesByType: Record<string, ResourceHelperMap> = {};
            if ($resources) {
                for (const rh of Object.values($resources) as ResourceHelper[]) {
                    if (!(rh.resource.resourceType in resourcesByType)) {
                        resourcesByType[rh.resource.resourceType] = {};
                    }
                    resourcesByType[rh.resource.resourceType][rh.tempId] = rh;
                }
            }
            return resourcesByType;
        });
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

    addResource(resource: Resource): ResourceHelper {
        // Remove system identifier from IPS resources
        if (resource.identifier) {
            resource.identifier = resource.identifier.filter(i => i.system !== IDENTIFIER_SYSTEM);
            if (resource.identifier.length === 0) {
                delete resource.identifier;
            }
        }
        return super.addResource(resource);
    }

    addResources(resources:Resource[]) {
        const datasetPatient = resources.find(r => r.resourceType === 'Patient' && r.meta?.tag?.find(t => t.system === METHOD_SYSTEM));
        resources = resources.filter(r => {
            if (!this._validateResource(r)) {
                console.warn("Invalid IPS resource: " + JSON.stringify(r));
                return false;
            }
            if (r.resourceType === 'Patient' && r.meta?.tag?.find(t => t.system === PLACEHOLDER_SYSTEM)) {
                return false;
            }
            return true;
        });
        const datasetMethod = datasetPatient?.meta?.tag?.find(t => t.system === METHOD_SYSTEM)?.code;
        let sectionExtenderForMethod = this.sectionExtenderRegistry.register(datasetMethod);
        let extendedSectionTitle = sectionExtenderForMethod?.getSectionTitle();
        resources.forEach(r => {
            const rh = this.addResource(r);
            if (datasetPatient && datasetMethod && sectionExtenderForMethod && extendedSectionTitle) {
                // Add resource ids to extended section list
                this.sectionExtensionResources.update((curr) => {
                    curr[extendedSectionTitle] = curr[extendedSectionTitle] ?? new Set<string>();
                    curr[extendedSectionTitle].add(rh.tempId);
                    return { ...curr };
                });
            }
        });
    }

    extendIPS(ips: Bundle) {
        // Validate bundle is IPS
        if (!isIPSBundle(ips)) {
            throw new Error("Bundle is not an IPS bundle");
        }
        const composition = ips.entry?.find(entry => entry.resource?.resourceType === "Composition").resource as Composition;

        // get the extenders from the registry (they're deduplicated by the registry)
        const extenders = this.sectionExtenderRegistry.getRegisteredExtenders();
        // for each of them, call the extend function using the appropriate resource list
        const updates: { update: SectionUpdates, selector: Function }[] = [];
        for (const extender of extenders) {
            const sectionTitle = extender.getSectionTitle();
            const resourceIdsForExtension = Array.from(get(this.sectionExtensionResources)[sectionTitle]);
            const resourcesForExtension = resourceIdsForExtension
                .map(resourceTempId => get((this as ResourceCollection).resources)[resourceTempId])
                .filter(rh => rh.include)
                .map(rh => rh.resource);
            const existingSection = composition.section.find(s => extender.sectionSelector(s));
            const update = extender.extend(resourcesForExtension, existingSection);
            if (update) {
                updates.push({
                    update: update,
                    selector: extender.sectionSelector
                });
            }
        }

        for (const update of updates) {
            if (update.update.section) {
                // replace or add updated section
                const index = composition.section.findIndex(update.selector);
                if (index !== -1) {
                    composition.section.splice(index, 1);
                }
                composition.section.push(update.update.section);
            }
            if (update.update.entries) {
                // add updated entries
                ips.entry?.push(...update.update.entries);
            }
        }
        return ips;
    }

    getResourcesByType() {
        return this.resourcesByType;
    }

    /**
     * Gets the list of resources that are selected for upload.
     * @returns The list of selected resources.
     */
    getSelectedIPSResources(): ResourceHelper[] {
        let rBT = get(this.resourcesByType);
        let selectedIPSResources = this.flattenResources(rBT)
            .filter(resource => (resource as ResourceHelper).include ) as ResourceHelper[];
        return selectedIPSResources;
    }

    flattenResources(resourcesByType: Record<string, Record<string, ResourceHelper>>) {
        return Object.values(resourcesByType).flatMap(types => Object.values(types))
    }

    clear() {
        this.sectionExtensionResources.set({});
        this.sectionExtenderRegistry = new SectionExtenderRegistry();
        super.clear();
    }
}
