/**
 * @module ResourceCollection
 * @description A class that holds a list of resources pertaining to a patient
 * provides methods for adding, removing, and retrieving resources,
 * setting the selected patient, and updating the patient references in
 * each resource to match.
 * @exports ResourceCollection
 * @exports SerializedResourceCollection
 */
import { ResourceHelper } from "$lib/utils/ResourceHelper";
import type { Patient, Resource } from "fhir/r4";
import { writable, derived, get, type Writable, type Readable } from "svelte/store";
import type { ResourceHelperMap, IResourceCollection } from "$lib/utils/types";
import type { SerializedResourceHelper } from "$lib/utils/ResourceHelper";
import { CATEGORY_SYSTEM, METHOD_SYSTEM, SOURCE_NAME_SYSTEM, PLACEHOLDER_SYSTEM } from "$lib/config/config";

export interface SerializedResourceCollection {
    resources: SerializedResourceHelper[];
    selectedPatient: string;
}

export class ResourceCollection implements IResourceCollection {
    public id: string = crypto.randomUUID();
    public resources: Writable<ResourceHelperMap> = writable({});
    public selectedPatient: Writable<string>;
    public patientReference: Readable<string>;
    public patient: Readable<Patient | undefined>;

    constructor();
    constructor(r: Resource | Resource[] | null);
    constructor(r: Resource | Resource[] | null = null) {
        this.resources = writable({});
        this.selectedPatient = writable('');
        this.patient = derived(this.selectedPatient, ($selectedPatient) => {
          if ($selectedPatient) {
              let resources = get(this.resources);
              if (resources) {
                return resources[$selectedPatient].resource;
              }
          }
        });
        this.patientReference = derived(this.patient, ($patient) => {
            if ($patient) {
                return `Patient/${$patient.id}`;
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

    _updatePatientRef(rh: ResourceHelper) {
        const newPatientRef = get(this.patientReference);
        if (rh.resource.subject) {
            rh.resource.subject.reference = newPatientRef;
        } else if (rh.resource.patient) {
            rh.resource.patient.reference = newPatientRef;
        }
        return rh;
    }

    /**
     * Sets the patient reference on each resource in the list of resources.
     * @param resources The list of resources to set the patient references on.
     * @returns The list of resources with the patient references set.
    */
    _updateAllPatientRefs() {
        this.resources.update((currState:ResourceHelperMap) => {
            Object.values(currState).map((rh: ResourceHelper) => this._updatePatientRef(rh));
            return { ...currState };
        });
    }

    /**
     * Adds a resource to a resource list. If the resource already
     * exists in the list, it will not be added again.
     * @param resource The resource to add.
     */
    addResource(resource: Resource): ResourceHelper {
      let rh = this._updatePatientRef(new ResourceHelper(resource));
      this.resources.update((curr) => {
          if (!(rh.tempId in curr)) {
              curr[rh.tempId] = rh;
              if (rh.resource.resourceType === 'Patient' && (!get(this.patient))) {
                  this.setSelectedPatient(rh.tempId);
              }
          }
          return { ...curr };
      });
      return rh;
    }

    /**
     * Adds a list of resources to the resource list. If a resource already
     * exists in the list, it will not be added again.
     * @param resources The list of resources to add.
     */

    // May want to add signature accepting a sectionKey function to handle more complex cases
    addResources(resources:Resource[]): ResourceHelper[]{
        let result = resources.map(r => this.addResource(r));
        return result;
    }

    updateResource(rh: ResourceHelper) {
        this.resources.update((curr) => {
            curr[rh.tempId] = rh;
            return { ...curr };
        });
    }

    setSelectedPatient(patientTempId: string) {
        let patients = Object.values(get(this.resources)).filter(rh => rh.resource.resourceType === 'Patient');
        if (patients.length === 0) {
            throw Error('No patients exist');
        }
        this.resources.update((curr:ResourceHelperMap) => {
            patients.forEach((rh:ResourceHelper) => {
                rh.include = (rh.tempId == patientTempId);
            });
            return { ...curr };
        })
        this.selectedPatient.set(patientTempId);
        this._updateAllPatientRefs();
    }

    removeResources(resources: Resource[]) {
        let resourceHelpers = resources.map(r => new ResourceHelper(r));
        this.resources.update((curr) => {
            resourceHelpers.forEach(rh => {
                delete curr[rh.tempId];
            });
            return { ...curr };
        });
    }

    getResources() {
        return this.resources;
    }

    getResourceCount() {
        return Object.keys(get(this.resources)).length;
    }

    getFHIRResources() {
        return this.flattenResources(get(this.resources)).map(rh => rh.resource);
    }

    getSelectedPatient() {
        return get(this.patient);
    }

    flattenResources(resources: ResourceHelperMap) {
        return Object.values(resources);
    }

    getTags(): {
        category: string,
        method: string,
        source: string,
        sourceName: string,
        placeholder: boolean
    } {
        const patient = get(this.patient);
        const category = patient.meta.tag.filter((tag) => tag.system === CATEGORY_SYSTEM)?.[0]?.code;
        const method = patient.meta.tag.filter((tag) => tag.system === METHOD_SYSTEM)?.[0]?.code;
        const source = patient.meta.source?.split('#')[0];
        const sourceName = patient.meta.tag.filter((tag) => tag.system === SOURCE_NAME_SYSTEM)?.[0]?.code ?? source;
        const placeholder = patient.meta.tag.filter((tag) => tag.system === PLACEHOLDER_SYSTEM)?.[0]?.code;
        return {
            category,
            method,
            source,
            sourceName,
            placeholder
        }
    }

    toJson(): string {
        let resources = get(this.resources);
        let output:SerializedResourceCollection = {
            resources: resources.map(rh => rh.toJson()),
            selectedPatient: get(this.selectedPatient),
        }
        return JSON.stringify(output);
    }

    static fromJson(json:string) {
        let data:SerializedResourceCollection = JSON.parse(json);
        let newCollection = new this();
        if (data.resources) {
            newCollection.resources.set(data.resources);
        }
        if (data.selectedPatient) {
            newCollection.setSelectedPatient(data.selectedPatient);
        }
        return newCollection;
    }

    clear() {
        this.resources.set({});
        this.selectedPatient.set('');
    }
}
