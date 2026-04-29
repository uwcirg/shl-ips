/**
 * Class that encapsulates the data for a user including their demographics and associated resources stored in the intermediate FHIR server.
 * 
 * @property {Writable<Record<string, ResourceCollection>>} userResources - The user's saved fhir resources
 * @property {UserDemographics} demographics - The user's demographic form information
 * @property {Writable<boolean>} patientFound - Whether or not the master patient was fetched from the FHIR server
 * 
 * @function loadUserData - Load in the user's FHIR data
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

export class FHIRServiceError extends Error {
  constructor(
    userMessage: string,
    public readonly operation: string,
    public readonly cause?: unknown
  ) {
    super(userMessage);
    this.name = 'FHIRServiceError';
  }
}

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
    this.patientLinks = derived(this.masterPatient, ($masterPatient) => $masterPatient?.resource?.link ?? []);
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

  getAllResourceCollections(): ResourceCollection[] {
    let resources = get(this.userResources);
    const collections = function* () {
      for (const category in resources) {
        for(const method in resources[category]) {
          for (const source in resources[category][method]) {
            yield resources[category][method][source].collection;
          }
        }
      }
    }
    return Array.from(collections());
  }

  async loadUserData(): Promise<void> {
    let resourceCollections = this.getAllResourceCollections();
    if (resourceCollections.length === 0) {
      this.loading.set(true);
      // Load bare minimum for datasets to be operated on
      resourceCollections = await this.seedUserResources().catch((error) => {
        this.loading.set(false);
        throw new FHIRServiceError('Unable to load user data', 'loadUserData', error);
      }) ?? [];
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
    
    let patientOnlyDatasets = patientResults
      .filter((result): result is PromiseFulfilledResult<ResourceCollection> => result.status === 'fulfilled' && result.value !== undefined)
      .map((result) => result.value);
    
    patientResults
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .forEach((result) => console.warn('Failed to load dataset', result.reason));
    
    return await this.deduplicateCollections(patientOnlyDatasets);
  }
  
  private async deduplicateCollections(collections: ResourceCollection[]): Promise<ResourceCollection[]> {
    // Group by category|method|source
    const getKey = (collection: ResourceCollection) => {
      const { category, method, source } = collection.getTags();
      return `${category}|${method}|${source}`;
    }
    const grouped: Record<string, ResourceCollection[]> = {};
    for (const collection of collections) {
      const key = getKey(collection);
      grouped[key] = [...(grouped[key] ?? []), collection];
    }

    const isDuplicated = (collections: ResourceCollection[]) => collections.length > 1;
    const duplicates: ResourceCollection[][] = Object.values(grouped).filter((group) => isDuplicated(group));
    if (duplicates.length === 0) {
      return collections;
    }
  
    const deduplicated: ResourceCollection[] = Object.values(grouped).filter((group) => !isDuplicated(group)).flat();
  
    await Promise.allSettled(
      Object.values(duplicates).map(async (group) => {
        // Sort newest first
        const sorted = group.sort((a, b) =>
          new Date(get(b.patient).meta?.lastUpdated).getTime() -
          new Date(get(a.patient).meta?.lastUpdated).getTime()
        );
  
        const [newest, ...older] = sorted;
        deduplicated.push(newest);
  
        // Silently clean up older duplicates
        await Promise.allSettled(
          older.map(async (duplicate) => {
            const key = getKey(duplicate);
            const patientId = get(duplicate.patient).id;
            try {
              await this.removeLinkFromMasterPatient(`Patient/${patientId}`);
              await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient/${patientId}?_cascade=delete`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${await this.auth.getAccessToken()}` }
              });
              console.info(`Cleaned up duplicate dataset ${key}`);
            } catch (err) {
              // Non-fatal — the duplicate stays until next load
              console.warn(`Failed to clean up duplicate dataset ${key}`, err);
            }
          })
        );
      })
    );
  
    return deduplicated;
  }

  private async syncDataset(category: string, method: string, source: string): Promise<void> {
    let dataset = get(this.userResources)?.[category]?.[method]?.[source];
    if (!dataset) {
      console.warn(`Category ${category}/method ${method}/source ${source} not found`);
      return;
    }
    let { status, collection } = dataset;
    status.set({ state: StateManager.State.LOADING });
    try {
      let datasetPatientId = get(collection.patient).id;
      let newDataset = await this.fetchDatasetFromPatientReference(`Patient/${datasetPatientId}`);
      this.addDatasetToUserResources(newDataset);
      status = get(this.userResources)?.[category]?.[method]?.[source].status;
      status.set({ state: StateManager.State.IDLE });
    } catch (err) {
      status.set({ state: StateManager.State.ERROR });
      console.warn(`Couldn't show current data for ${source}`, err);
    }
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
      .catch((response) => {
        throw new FHIRServiceError('Unable to get current patient', 'fetchAuthUserPatient', response);
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
        if (response.ok) return response.text();
        return Promise.reject(response);
      })
      .then((data) => JSON.parse(data))
      .catch((response) => {
        response.text().then((text: any) => {
          try {
            console.log(JSON.parse(text));
          } catch (err) {
            console.log(text);
          }
        });
        throw new FHIRServiceError('Failed to save patient', 'createOrUpdateMasterPatient', response);
      });
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
        if (response.ok) return response.text();
        return Promise.reject(response);
      })
      .then((data) => JSON.parse(data))
      .catch((response) => {
        response.text().then((text: any) => {
          try {
            console.log(JSON.parse(text));
          } catch (err) {
            console.log(text);
          }
        });
        throw new FHIRServiceError('Failed to save patient', 'createOrUpdateMasterPatient', response);
      })
      savedPatient = newPatient;
    }
    if (savedPatient === undefined) {
      throw new FHIRServiceError('Failed to save patient', 'createOrUpdateMasterPatient');
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
      email: userAuthProfile.email,
      gender: userAuthProfile.gender?.toLowerCase(),
      dob: userAuthProfile.birthday
    });
    return patient;
  }

  syncDemographicsToPatient(): void {
    const userDemographics = getDemographicsFromPatient(get(this.masterPatient).resource);
    this.demographics.set(userDemographics);
  }

  // Update master patient with demographics data
  async saveDemographicsToPatient(): Promise<void> {
    try {
      const demographics = get(this.demographics);
      let patientFromDemographics = constructPatientResource(demographics, get(this.masterPatient).resource);
      delete patientFromDemographics.meta.tag;
      await this.createOrUpdateMasterPatient(patientFromDemographics);
    } catch (err) {
      throw new FHIRServiceError('Failed to save changes', 'saveDemographicsToPatient', err);
    }
  }

  generateCategoryPlaceholderPatient(): Resource {
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
    const sortedDatasetsWithStatus = datasetsWithStatus.sort((a, b) => new Date((get(b.collection.patient))?.meta?.lastUpdated).getTime() - new Date((get(a.collection.patient))?.meta?.lastUpdated).getTime());
    return sortedDatasetsWithStatus as Array<{ status: StateManager, collection: ResourceCollection}>;
  }

  getDatasetsForCategoryAndMethod(category: string, method: string): Array<{ status: StateManager, collection: ResourceCollection}> {
    const userResources = get(this.userResources);
    const categoryContent = userResources?.[category];
    if (!categoryContent) return [];
    const methodContent = categoryContent[method];
    if (!methodContent) return [];
    const datasetsWithStatus = Object.values(methodContent);
    const sortedDatasetsWithStatus = datasetsWithStatus.sort((a, b) => new Date((get(b.collection.patient))?.meta?.lastUpdated).getTime() - new Date((get(a.collection.patient))?.meta?.lastUpdated).getTime());
    return sortedDatasetsWithStatus as Array<{ status: StateManager, collection: ResourceCollection}>;
  }

  addDatasetToUserResources(collection: ResourceCollection): {status: StateManager; collection: ResourceCollection;} {
    let patient = get(collection.patient);
    if (!patient) {
      throw new FHIRServiceError('No patient resource found in resource collection', 'addDatasetToUserResources');
    }
    const { category, method, source } = collection.getTags();
    if (!category) {
      throw new FHIRServiceError('Could not determine dataset category', 'addDatasetToUserResources');
    }
    if (!method) {
      throw new FHIRServiceError('Could not determine dataset method', 'addDatasetToUserResources');
    }
    if (!source) {
      throw new FHIRServiceError('Could not determine dataset source', 'addDatasetToUserResources');
    }

    let sm = new StateManager();

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
            status: sm,
            collection,
          }
        }
      };
      return categoryMapCopy;
    });
    return { status: sm, collection };
  }

  removeDatasetFromUserResources(category: string, method: string, source: string): void {
    this.userResources.update((categoryMap) => {
      const categoryMapCopy = { ...categoryMap };
      if (!category || !method || !source) {
        return categoryMapCopy;
      }
      if (categoryMapCopy[category]?.[method]?.[source]) {
        delete categoryMapCopy[category][method][source];
        if (Object.keys(categoryMapCopy[category][method]).length === 0) {
          delete categoryMapCopy[category][method];
        }
        if (Object.keys(categoryMapCopy[category]).length === 0) {
          delete categoryMapCopy[category];
        }
      }
      return categoryMapCopy;
    });
  }

  async createDatasetOnServer(resources: Resource[]): Promise<string> {
    let datasetCollection = new ResourceCollection(resources);
    let updatedResources = datasetCollection.getFHIRResources();
    let transactionResponse = await uploadResources(updatedResources, await this.auth.getAccessToken());
    if (transactionResponse.resourceType === "OperationOutcome") {
      throw new FHIRServiceError('Failed to upload dataset', 'createDatasetOnServer', transactionResponse.issue);
    }
    let patientReference = await getPatientReferenceFromTransactionResponse(transactionResponse);
    return patientReference;
  }

  addLinkToMasterPatient(patientReference: string): Patient {
    let masterPatient = structuredClone(get(this.masterPatient).resource);
    if (!masterPatient.link) {
      masterPatient.link = [];
    }
    masterPatient.link.push({ other: { reference: patientReference }, type: "seealso" });
    return masterPatient;
  }

  private async removeLinkFromMasterPatient(patientReference: string): Promise<void> {
    const masterPatient = structuredClone(get(this.masterPatient).resource);
    masterPatient.link = (masterPatient.link ?? []).filter(
      (link) => link.other.reference !== patientReference
    );
    if (masterPatient.link.length === 0) {
      delete masterPatient.link;
    }
    await this.createOrUpdateMasterPatient(masterPatient);
  }

  async deleteDatasetFromServer(category: string, method: string, source: string): Promise<void> {
    let dataset = get(this.userResources)?.[category]?.[method]?.[source];
    if (!dataset) {
      return;
    }
    if (dataset.status.state === StateManager.State.LOADING) {
      throw new FHIRServiceError('Cannot delete a dataset that is currently loading', 'deleteDatasetFromServer');
    }

    // Update master patient
    let collection = dataset.collection;
    const datasetPatientId = get(collection.patient).id;
    let masterPatient = structuredClone(get(this.masterPatient).resource);
    if (!masterPatient.link) {
      throw new FHIRServiceError('Patient has no linked datasets.', 'deleteDatasetFromServer');
    }
    const datasetPatientReference = `Patient/${datasetPatientId}`;
    let datasetPatientLinkIndex = masterPatient.link.findIndex((link) => link.other.reference === datasetPatientReference);
    if (datasetPatientLinkIndex === -1) {
      throw new FHIRServiceError('Dataset does not exist in patient records.', 'deleteDatasetFromServer');
    }
    masterPatient.link.splice(datasetPatientLinkIndex, 1);
    if (masterPatient.link.length === 0) {
      delete masterPatient.link;
    }
    try {
      await this.createOrUpdateMasterPatient(masterPatient);
    } catch (err) {
      throw new FHIRServiceError(
        'Failed to delete dataset from patient record',
        'deleteDatasetFromServer',
        err
      );
    }

    // Delete after master patient.link is updated to prevent cascade from deleting master patient resource
    let deleteResult = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient/${datasetPatientId}?_cascade=delete`, {
      method: 'DELETE',
      headers: {
        "Authorization": `Bearer ${await this.auth.getAccessToken()}`
      }
    });

    if (!deleteResult.ok) {
      throw new FHIRServiceError(`Failed to delete dataset: ${await deleteResult.text()}`, 'deleteDatasetFromServer', deleteResult);
    }
  }

  async deleteDataset(category: string, method: string, source: string) {
    try {
      await this.deleteDatasetFromServer(category, method, source);
      this.removeDatasetFromUserResources(category, method, source);
    } catch (err) {
      throw new FHIRServiceError(`Failed to delete ${source} dataset`, 'deleteDataset', err);
    }
  }

  async addOrReplaceDataset(dataset: ResourceRetrieveEvent) {
    let resourcesWithUpdatedPatient = this.updateDatasetPatient(dataset);
    let newDataset;
    let status;
    let existingDataset = get(this.userResources)?.[dataset.category]?.[dataset.method]?.[dataset.source];
    if (!existingDataset) {
      let patient = resourcesWithUpdatedPatient.find((resource) => resource.resourceType === "Patient");
      let seedCollection = new ResourceCollection(patient);
      newDataset = this.addDatasetToUserResources(seedCollection);
      status = newDataset.status;
    } else {
      status = existingDataset.status;
    }
    status.set({ state: StateManager.State.LOADING });

    let patientReference: string;
    try {
      patientReference = await this.createDatasetOnServer(resourcesWithUpdatedPatient);
    } catch(error) {
      status.set({ state: StateManager.State.ERROR });
      throw new FHIRServiceError(`Failed to upload ${dataset.source} dataset`, 'addOrReplaceDataset', error);
    }

    try {
      let masterPatient =this.addLinkToMasterPatient(patientReference);
      await this.createOrUpdateMasterPatient(masterPatient);
    } catch(error) {
      // Rollback create
      status.set({ state: StateManager.State.ERROR });
      if (!existingDataset) {
        this.removeDatasetFromUserResources(dataset.category, dataset.method, dataset.source);
      }
      const rollback = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/${patientReference}?_cascade=delete`, {
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${await this.auth.getAccessToken()}`
        }
      });
      if (!rollback.ok) {
        console.warn(`Rollback failed for ${dataset.source} — will be cleaned up on next load`);
      }
      throw new FHIRServiceError('Failed to link dataset to your account', 'addOrReplaceDataset', error);
    }

    try {
      if (existingDataset) {
        await this.deleteDatasetFromServer(dataset.category, dataset.method, dataset.source);
      }
    } catch(error) {
      console.warn('Failed to delete old dataset, will be cleaned up on next load', error);
    }

    // Finalize the add - dataset is on server, bring it to the client
    newDataset = await this.fetchDatasetFromPatientReference(patientReference);
    this.addDatasetToUserResources(newDataset);
    status.set({ state: StateManager.State.IDLE });
  }

  updateDatasetPatient(datasetInfo: ResourceRetrieveEvent): Resource {
    let { resources, category, method, source, sourceName } = datasetInfo;
    let resourcesWithUpdatedPatient = resources;
    let patient = resources?.find((resource) => resource.resourceType === "Patient");
    if (!patient) {
      patient = this.generateCategoryPlaceholderPatient();
      resourcesWithUpdatedPatient = [ patient, ...(resources ?? []) ];
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
