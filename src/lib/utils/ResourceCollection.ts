import { ResourceHelper } from "$lib/utils/ResourceHelper";
import type { Patient, Resource } from "fhir/r4";
import { writable, derived, get, type Writable, type Readable } from "svelte/store";
import type { ResourceHelperMap, IResourceCollection } from "$lib/utils/types";
import { SerializedResourceHelper } from "./ResourceHelper";

export interface SerializedResourceCollection {
    resources: SerializedResourceHelper[];
    selectedPatient: string;
    categories: Record<string, string>;
}

export class ResourceCollection implements IResourceCollection {
    resources: Writable<ResourceHelperMap>;
    categories: Writable<Record<string, string>>;
    selectedPatient: Writable<string>;
    patientReference: Readable<string>;
    patient: Readable<Patient | undefined>;

    constructor();
    constructor(r: Resource | Resource[] | null);
    constructor(r: Resource | Resource[] | null = null) {
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
        this.categories = derived(this.resources, ($resources) => {
            let tempCategories: Record<string, string> = {};
            for (const rh of Object.values($resources) as ResourceHelper[]) {
                for (const category of rh.categories) {
                    tempCategories[category] = rh.tempId;
                }
            }
          
        })
    }

    /**
     * Sets the patient reference on each resource in the list of resources.
     * @param resources The list of resources to set the patient references on.
     * @returns The list of resources with the patient references set.
    */
    _updatePatientRefs() {
        this.resources.update((currState:ResourceHelperMap) => {
            let newPatientRef = get(this.patientReference);
            Object.values(currState).forEach((rh: ResourceHelper) => {
                if (rh.resource.subject) {
                    rh.resource.subject.reference = newPatientRef;
                } else if (rh.resource.patient) {
                    rh.resource.patient.reference = newPatientRef;
                }
            });
            return { ...currState };
        });
    }

    /**
     * Adds a resource to a resource list. If the resource already
     * exists in the list, it will not be added again.
     * @param resource The resource to add.
     */
    addResource(resource: Resource, categories?:string[]) {
      let rh = new ResourceHelper(resource, categories);
      this.resources.update((curr) => {
          if (!(rh.tempId in curr)) {
              curr[rh.tempId] = rh;
              if (rh.resource.resourceType === 'Patient' && (!get(this.patient))) {
                  this.setSelectedPatient(rh.tempId);
              }
          }
          return { ...curr };
      });
    }

    /**
     * Adds a list of resources to the resource list. If a resource already
     * exists in the list, it will not be added again.
     * @param resources The list of resources to add.
     */

    // May want to add signature accepting a sectionKey function to handle more complex cases
    addResources(resources:Resource[], categories?:string[]) {
        resources.forEach(r => this.addResource(r, categories));
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
            return curr;
        })
        this.selectedPatient.set(patientTempId);
        this._updatePatientRefs();
    }

    getResources() {
        return this.resources;
    }

    getSelectedPatient() {
        return get(this.patient);
    }

    flattenResources(resources: ResourceHelperMap) {
        return Object.values(resources);
    }

    toJson(): string {
        let resources = get(this.resources);
        let output:SerializedResourceCollection = {
            resources: resources.map(rh => rh.toJson()),
            selectedPatient: get(this.selectedPatient),
            categories: get(this.categories)
        }
        return JSON.stringify(output);
    }

    static fromJson(json:string) {
        let data:SerializedResourceCollection = JSON.parse(json);
        let newCollection = new ResourceCollection();
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
        this.categories.set({});
        this.selectedPatient.set('');
    }
}
