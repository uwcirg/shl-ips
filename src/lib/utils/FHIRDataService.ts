/**
 * Class that encapsulates the data for a user including their demographics and associated resources stored in the intermediate FHIR server.
 * 
 * @property {Writable<Record<string, ResourceCollection>>} userResources - The user's saved fhir resources
 * @property {UserDemographics} demographics - The user's demographic form information
 * @property {Writable<boolean>} patientFound - Whether or not the master patient was fetched from the FHIR server
 * 
 * @function loadUserData - Load in the user's SHL and FHIR data
 * @function syncDemographicsToPatient - Sync the user's demographics form data to the FHIR server
 * @function demographicsMatchPatient - Determine if the demographics form data matches the current patient
 * @function saveDemographicsAsPatient - Create or update a patient resource on the FHIR server based on the demographic store
 */

import { get, writable, derived, type Readable, type Writable } from "svelte/store";
import { ResourceCollection } from "$lib/utils/ResourceCollection";
import {
  INTERMEDIATE_FHIR_SERVER_BASE,
  IDENTIFIER_SYSTEM,
  CATEGORY_SYSTEM,
  METHOD_SYSTEM,
  PLACEHOLDER_SYSTEM,
  SOURCE_NAME_SYSTEM
} from "$lib/config/config";
import type { IAuthService, ResourceRetrieveEvent, UserDemographics } from "$lib/utils/types";
import { ResourceHelper } from "$lib/utils/ResourceHelper";
import type { Patient, Resource } from "fhir/r4";
import { constructPatientResource, getDemographicsFromPatient, fetchEverything } from "$lib/utils/util";
import { uploadResources, getPatientReferenceFromTransactionResponse } from "$lib/utils/resourceUploader";
import { StateManager } from "$lib/utils/StateManager";

export class FHIRDataService {
  auth: IAuthService;

  // {[Category] -> [Method] -> [Source] -> { status: StateManager, collection: ResourceCollection }}
  userResources: Writable<Record<string, Record<string, Record<string, { status: StateManager, collection: ResourceCollection}>>>>;

  masterPatient: Writable<ResourceHelper>;
  demographics: Writable<UserDemographics>;
  patientLinks: Readable<Array<any>>;
  loading: Writable<boolean>;

  constructor(auth: IAuthService) {
    this.auth = auth;
    this.userResources = writable({});
    this.masterPatient = writable(null);
    this.demographics = writable({});
    this.patientLinks = derived(this.masterPatient, ($masterPatient) => $masterPatient.resource.link);
    this.loading = writable(false);
  }

  // Get the cached, fetched, or newly created master patient
  async getOrCreateMasterPatient(): Promise<ResourceHelper> {
    return (
      get(this.masterPatient) ??
      await this.fetchAuthUserPatient() ??
      await this.createOrUpdateMasterPatient(this.generateMasterPatientFromAuth())
    );
  }

  // Set the master patient to the given patient resource and update the demographics store
  setMasterPatient(patient: Patient): ResourceHelper {
    this.masterPatient.set(new ResourceHelper(patient));
    this.syncDemographicsToPatient();
    return get(this.masterPatient);
  }

  async loadUserData(): Promise<void> {
    this.loading.set(true);
    // Load bare minimum for datasets to be operated on
    let resourceCollections = await this.seedUserResources();
    if (!resourceCollections) {
      throw new Error('Unable to retrieve user data');
    }
    resourceCollections.map((collection) => this.addDatasetToUserResources(collection));
    this.loading.set(false);
    
    // Finish loading datasets
    resourceCollections.forEach((collection) => {
      const { category, method, source } = collection.getTags();
      this.syncDataset(category, method, source);
    });
    
  }

  private async seedUserResources(): Promise<Array<ResourceCollection> | undefined> {
    let patient: ResourceHelper = await this.getOrCreateMasterPatient();
    let patientLinks = patient.resource.link;
    if (!(patientLinks?.length > 0)) {
      return [];
    }
    let patientResults = await Promise.allSettled(patientLinks.map(async (link) => {
      let datasetPatientReference = link.other.reference;
      let patientOnlyDatasets = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/${datasetPatientReference}`, {
        cache: "no-cache",
        headers: {
          "Authorization": `Bearer ${await this.auth.getAccessToken()}`
        }
      })
        .then((response) => response.text())
        .then((data) => JSON.parse(data))
        .then((patient) => new ResourceCollection(patient));
      return patientOnlyDatasets;
    }));
    let patientOnlyDatasets = patientResults.filter((result) => result.status === 'fulfilled' && result.value !== undefined).map((result) => result.value);
    return patientOnlyDatasets;
  }

  private async syncDataset(category: string, method: string, source: string): Promise<void> {
    let dataset = get(this.userResources)?.[category]?.[method]?.[source];
    if (!dataset) {
      console.warn("Category " + category + "/method " + method + "/source " + source + " not found");
      return;
    }
    let { status, collection } = dataset;
    status.set({ state: StateManager.State.LOADING });
    let datasetPatientId = get(collection.patient).id;
    let newDataset = await this.fetchDatasetFromPatientReference(`Patient/${datasetPatientId}`);
    this.addDatasetToUserResources(newDataset);
    // Update status reference
    status = get(this.userResources)?.[category]?.[method]?.[source].status;
    status.set({ state: StateManager.State.IDLE });
  }

  async fetchDatasetFromPatientReference(patientReference: string): Promise<ResourceCollection> {
    return fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/${patientReference}/$everything?_count=1000`, {
      cache: "no-store",
      headers: {
        "Authorization": `Bearer ${await this.auth.getAccessToken()}`
      }
    })
    .then((response) => response.text())
    .then((data) => JSON.parse(data))
    .then((data) => {
      if (data?.entry?.length > 0) {
        return data.entry.map((entry) => entry.resource).filter((resource) => !(resource.resourceType === 'Patient' && resource.id === get(this.masterPatient).resource.id));
      }
    })
    .then((data) => new ResourceCollection(data));
  }

  async fetchAuthUserPatient(): Promise<ResourceHelper | undefined> {
    let patient = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient?identifier=${IDENTIFIER_SYSTEM}%7C${get(this.auth.userId)}`, {
        cache: "no-cache",
        headers: {
          "Authorization": `Bearer ${await this.auth.getAccessToken()}`
        }
      })
      .then((response) => response.text())
      .then((data) => JSON.parse(data))
      .then((data) => {
        if (data?.total > 0) {
          return data.entry?.[0].resource;
        }
      })
      .catch((error) => {
        if (error.status === 404) {
          return undefined;
        }
        throw error;
      });
    if (patient !== undefined) {
      return this.setMasterPatient(patient);
    }
    return undefined;
  }
  
  async createOrUpdateMasterPatient(patient: Resource): Promise<ResourceHelper> {
    let savedPatient: Patient;
    if (get(this.masterPatient) === null) {
      this.setMasterPatient(patient);
    }
    if (get(this.masterPatient).resource.id) {
      patient.id = get(this.masterPatient).resource.id;
      let updatedPatient = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient/${patient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/fhir+json',
          'Authorization': `Bearer ${await this.auth.getAccessToken()}`
        },
        body: JSON.stringify(patient)
      })
      .then((response) => {
        if (response.ok) {
          return response.text()
        }
        Promise.reject(response);
      })
      .then((data) => JSON.parse(data))
      .catch((response) => {
        console.log(response.status, response.statusText);
        response.json().then((json: any) => {
          console.log(json);
        });
      })
      savedPatient = updatedPatient;
    } else {
      if (patient.id) {
        delete patient.id;
      }
      let newPatient = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json',
          'Authorization': `Bearer ${await this.auth.getAccessToken()}`
        },
        body: JSON.stringify(patient)
      })
      .then((response) => {
        if (response.ok) {
          return response.text()
        }
        Promise.reject(response);
      })
      .then((data) => JSON.parse(data))
      .catch((response) => {
        console.log(response.status, response.statusText);
        response.json().then((json: any) => {
          console.log(json);
        });
      })
      savedPatient = newPatient;
    }
    if (savedPatient === undefined) {
      throw new Error("Unable to create or update patient");
    }
    return this.setMasterPatient(savedPatient);
  }

  // make a temporary patient to pre-fill demographic forms when one doesn't exist on the server
  // will be updated when demographics are submitted
  generateMasterPatientFromAuth(): Resource {
    const userAuthProfile = get(this.auth.user).profile;
    let patient = constructPatientResource({
      customIdentifiers: [{
        system: IDENTIFIER_SYSTEM,
        value: userAuthProfile.sub
      }],
      first: (userAuthProfile.given_name || userAuthProfile.firstName),
      last: (userAuthProfile.family_name || userAuthProfile.lastName),
      email: userAuthProfile.email
    });
    return patient;
  }

  syncDemographicsToPatient(): void {
    const userDemographics = getDemographicsFromPatient(get(this.masterPatient).resource);
    this.demographics.set(userDemographics);
  }

  // Update master patient with demographics data
  async saveDemographicsToPatient(): Promise<void> {
    const demographics = get(this.demographics);
    let patientFromDemographics = constructPatientResource(demographics, get(this.masterPatient).resource);
    delete patientFromDemographics.meta.tag;
    return this.createOrUpdateMasterPatient(patientFromDemographics);
  }

  generateCategoryPlaceholderPatient(): Promise<Resource> {
    const masterPatientResource = get(this.masterPatient).resource;
    let patient = constructPatientResource({
      first: masterPatientResource.name?.[0].given?.[0],
      last: masterPatientResource.name?.[0].family,
    });
    patient.id = "placeholder-patient";
    patient.meta = patient.meta ?? {};
    patient.meta.lastUpdated = new Date().toISOString();
    patient.meta.tag = patient.meta.tag ?? [];
    patient.meta.tag.push({
      system: PLACEHOLDER_SYSTEM,
      code: 'placeholder-patient'
    });
    return patient;
  }

  datasetExists(category: string, method: string, source: string): boolean {
    let datasetsInCategoryWithSource = get(this.userResources)?.[category]?.[method]?.[source];
    return datasetsInCategoryWithSource !== undefined;
  }

  getDatasetsForCategory(category: string): Array<{ status: StateManager, collection: ResourceCollection}> {
    const userResources = get(this.userResources);
    const categoryContent = userResources?.[category];
    if (!categoryContent) return [];
    const methodContent = Object.values(categoryContent);
    const datasetsWithStatus = methodContent.map(methodSource => Object.values(methodSource)).flat();
    const sortedDatasetsWithStatus = datasetsWithStatus.sort((a, b) => new Date((get(b.dataset.patient))?.meta?.lastUpdated) - new Date((get(a.dataset.patient))?.meta?.lastUpdated));
    return sortedDatasetsWithStatus as Array<{ status: StateManager, collection: ResourceCollection}>;
  }

  addDatasetToUserResources(collection: ResourceCollection): void {
    let patient = get(collection.patient);
    if (!patient) {
      throw new Error('No patient resource found in resource collection');
    }
    const { category, method, source } = collection.getTags();
    if (!category) {
      throw new Error('Category must be passed when creating a new dataset, or contained in the dataset patient resource\s meta.tag attribute.');
    }
    if (!method) {
      throw new Error('Method must be passed when creating a new dataset, or contained in the dataset patient resource\'s meta.tag attribute.');
    }
    if (!source) {
      throw new Error('Source must be passed when creating a new dataset, or contained in the dataset patient resource\'s meta.source attribute.');
    }

    this.userResources.update((categoryMap) => {
      const categoryMapCopy = {
        ...categoryMap
      };
      if (!category || !method || !source) {
        return categoryMapCopy;
      }
      // Safe when adding new categories, methods and sources
      categoryMapCopy[category] = {
        ...categoryMapCopy[category],
        [method]: {
          ...categoryMapCopy[category]?.[method],
          [source]: {
            status: new StateManager(),
            collection,
          }
        }
      };
      return categoryMapCopy;
    });
  }

  removeDatasetFromUserResources(category: string, method: string, source: string): void {
    this.userResources.update((categoryMap) => {
      const categoryMapCopy = { ...categoryMap };
      if (!category || !method || !source) {
        return categoryMapCopy;
      }
      if (categoryMapCopy[category]?.[method]?.[source]) {
        delete categoryMapCopy[category][method][source];
        if (categoryMapCopy[category][method] && Object.keys(categoryMapCopy[category][method]).length === 0) {
          delete categoryMapCopy[category][method];
        }
        if (categoryMapCopy[category] && Object.keys(categoryMapCopy[category]).length === 0) {
          delete categoryMapCopy[category];
        }
        
        return categoryMapCopy;
      }
    });
  }

  async createDatasetOnServer(resources: Resource[]): Promise<string> {
    let datasetCollection = new ResourceCollection(resources);
    let updatedResources = datasetCollection.getFHIRResources();
    let transactionResponse = await uploadResources(updatedResources, await this.auth.getAccessToken());
    let patientReference = await getPatientReferenceFromTransactionResponse(transactionResponse);
    return patientReference;
  }

  async deleteDatasetFromServer(category: string, method: string, source: string): Promise<void> {
    let dataset: ResourceCollection = get(this.userResources)?.[category]?.[method]?.[source];
    if (!dataset) {
      return;
    }
    if (dataset.status.state === StateManager.State.LOADING) {
      return; //TODO: raise error
    }

    // Update master patient
    let collection = dataset.collection;
    const datasetPatientId = get(collection.patient).id;
    let masterPatient = get(this.masterPatient).resource;
    if (!masterPatient.link) {
      throw new Error('Patient has no linked datasets.');
    }
    let datasetPatientLinkIndex = masterPatient.link.findIndex((link) => link.other.reference === `Patient/${datasetPatientId}`);
    if (datasetPatientLinkIndex === -1) {
      throw new Error('Dataset does not exist in master patient.');
    }
    if (datasetPatientLinkIndex > -1) {
      masterPatient.link.splice(datasetPatientLinkIndex, 1);
    }
    if (masterPatient.link.length === 0) {
      delete masterPatient.link;
    }
    await this.createOrUpdateMasterPatient(masterPatient);

    // Delete after patient.link is updated to prevent cascade from deleting master patient resource
    let deleteResult = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient/${datasetPatientId}?_cascade=delete`, {
      method: 'DELETE',
      headers: {
        "Authorization": `Bearer ${await this.auth.getAccessToken()}`
      }
    });
    if (!deleteResult.ok) {
      throw new Error(`Failed to delete dataset: ${await deleteResult.text()}`);
    }
  }

  deleteDataset(category: string, method: string, source: string) {
    this.deleteDatasetFromServer(category, method, source);
    this.removeDatasetFromUserResources(category, method, source);
  }

  async addOrReplaceDataset(dataset: ResourceRetrieveEvent) {
    if (get(this.userResources)?.[dataset.category]?.[dataset.method]?.[dataset.source]) {
      this.deleteDatasetFromServer(dataset.category, dataset.method, dataset.source);
    }
    let resourcesWithUpdatedPatient = this.updateDatasetPatient(dataset);
    let patient = resourcesWithUpdatedPatient.find((resource) => resource.resourceType === "Patient");
    let seedCollection = new ResourceCollection(patient);
    this.addDatasetToUserResources(seedCollection);
    let status = get(this.userResources)?.[dataset.category]?.[dataset.method]?.[dataset.source].status;
    status.set({ state: StateManager.State.LOADING });

    let patientReference = await this.createDatasetOnServer(resourcesWithUpdatedPatient);
    let masterPatient = get(this.masterPatient).resource;
    masterPatient.link = masterPatient.link ?? [];
    masterPatient.link.push({ other: { reference: patientReference }, type: "seealso" });
    await this.createOrUpdateMasterPatient(masterPatient);
    let newDataset = await this.fetchDatasetFromPatientReference(patientReference);
    this.addDatasetToUserResources(newDataset);
    status.set({ state: StateManager.State.IDLE });
  }

  updateDatasetPatient(datasetInfo: ResourceRetrieveEvent): Resource {
    let { resources, category, method, source, sourceName } = datasetInfo;
    let resourcesWithUpdatedPatient = resources;
    let patient = resources.find((resource) => resource.resourceType === "Patient");
    if (!patient) {
      patient = this.generateCategoryPlaceholderPatient();
      resourcesWithUpdatedPatient = [ patient, ...resources ];
    }
    patient.meta = patient.meta ?? {};
    patient.meta.tag = patient.meta.tag ?? [];
    patient.meta.tag.push({ system: CATEGORY_SYSTEM, code: category });
    patient.meta.tag.push({ system: METHOD_SYSTEM, code: method });
    if (sourceName) {
      patient.meta.tag.push({ system: SOURCE_NAME_SYSTEM, code: sourceName });
    }
    patient.meta.source = source;
    return resourcesWithUpdatedPatient;
  }
}

export default FHIRDataService;
