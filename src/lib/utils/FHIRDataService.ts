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
import { constructPatientResource, getDemographicsFromPatient } from "$lib/utils/util";
import { uploadResources, getPatientReferenceFromTransactionResponse } from "$lib/utils/resourceUploader";

export class FHIRDataService {
  auth: IAuthService;

  userResources: Writable<Record<string, Record<string, ResourceCollection>>>;
  masterPatient: Writable<ResourceHelper>;
  demographics: Writable<UserDemographics>;
  patientLinks: Readable<Array<any>>;

  constructor(auth: IAuthService) {
    this.auth = auth;
    this.userResources = writable({});
    this.masterPatient = writable(null);
    this.demographics = writable({});
    this.patientLinks = derived(this.masterPatient, ($masterPatient) => $masterPatient.resource.link);
  }

  // Get the cached, fetched, or newly created master patient
  async getOrCreateMasterPatient(): Promise<ResourceHelper> {
    return (
      get(this.masterPatient) ??
      await this.fetchPatient() ??
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
    let resourceCollections: Array<Array<Resource>> = await this.fetchUserResources();
    resourceCollections.map((collection) => this.addDatasetToUserResources(collection));
  }

  private async fetchUserResources(): Promise<Array<Array<Resource>>> {
    let patient: ResourceHelper = await this.getOrCreateMasterPatient();
    let patientLinks = patient.resource.link;
    if (patientLinks?.length > 0) {
      let userCategoryDatasetResults = await Promise.allSettled(patientLinks.map(async (link) => {
        let datasetPatientReference = link.other.reference;
        let dataset = await this.fetchDatasetFromPatientReference(datasetPatientReference);
        if (!dataset) {
          
        }
        return dataset;
      }));
      let userCategoryDatasets = userCategoryDatasetResults.filter((result) => result.status === 'fulfilled' && result.value !== undefined).map((result) => result.value);
      return userCategoryDatasets;
    }
    return [];
  }

  async fetchDatasetFromPatientReference(patientReference: string): Promise<Array<Resource>> {
    return fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/${patientReference}/$everything`, {
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
      });
  }

  async fetchPatient(): Promise<ResourceHelper | undefined> {
    let patient = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient?identifier=${IDENTIFIER_SYSTEM}%7C${get(this.auth.userId)}`, {
        cache: "no-store",
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
      .then((response) => response.text())
      .then((data) => JSON.parse(data));
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
      .then((response) => response.text())
      .then((data) => JSON.parse(data));
      savedPatient = newPatient;
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
    patient.meta.tag = patient.meta.tag ?? [];
    patient.meta.tag.push({
      system: PLACEHOLDER_SYSTEM,
      code: 'placeholder-patient'
    });
    return patient;
  }

  datasetExists(category: string, source: string): boolean {
    let datasetsInCategoryWithSource = get(this.userResources)?.[category]?.[source];
    return datasetsInCategoryWithSource !== undefined;
  }

  addDatasetToUserResources(resourceList: Resource[]): void {
    if (resourceList.length > 0) {
      let collection = new ResourceCollection(resourceList);
      let patient = get(collection.patient);
      if (!patient) {
        throw new Error('No patient resource found in resource collection');
      }
      let categories = patient.meta.tag.filter((tag) => tag.system === CATEGORY_SYSTEM);
      let category = categories?.[0]?.code;
      // let source = patient.meta?.source?.split('#')[0];
      let source = patient.meta.tag.filter((tag) => tag.system === SOURCE_NAME_SYSTEM)?.[0]?.code ?? patient.meta.source?.split('#')[0];
      if (!category) {
        throw new Error('Category must be passed when creating a new dataset, or contained in the dataset patient resource\s meta.tag attribute.');
      }
      if (!source) {
        throw new Error('Source must be passed when creating a new dataset, or contained in the dataset patient resource\'s meta.source attribute.');
      }

      this.userResources.update((categoryMap) => {
        if (!category || !source) {
          return { ...categoryMap };
        }
        if (!categoryMap[category]) {
          categoryMap[category] = {};
        }
        categoryMap[category][source] = collection;
        return { ...categoryMap };
      });
    }
  }

  removeDatasetFromUserResources(category: string, source: string): void {
    this.userResources.update((categoryMap) => {
      if (categoryMap[category]?.[source]) {
        delete categoryMap[category][source];
        if (categoryMap[category] && Object.keys(categoryMap[category]).length === 0) {
          delete categoryMap[category];
        }
        return { ...categoryMap };
      }
    })
  }

  async createDataset(dataset: ResourceRetrieveEvent): Promise<string> {
    let { resources, category, method, source, sourceName } = dataset;
    let patient = resources.find((resource) => resource.resourceType === "Patient");
    if (!patient) {
      patient = this.generateCategoryPlaceholderPatient();
      resources = [ patient, ...resources ];
    }
    patient.meta = patient.meta ?? {};
    patient.meta.tag = patient.meta.tag ?? [];
    patient.meta.tag.push({ system: CATEGORY_SYSTEM, code: category });
    patient.meta.tag.push({ system: METHOD_SYSTEM, code: method });
    if (sourceName) {
      patient.meta.tag.push({ system: SOURCE_NAME_SYSTEM, code: sourceName });
    }
    patient.meta.source = source;
    let datasetCollection = new ResourceCollection(resources);
    let updatedResources = datasetCollection.getFHIRResources();
    let transactionResponse = await uploadResources(updatedResources, await this.auth.getAccessToken());
    let patientReference = await getPatientReferenceFromTransactionResponse(transactionResponse);
    return patientReference;
  }

  async deleteDataset(category: string, source: string): Promise<void> {
    let dataset: ResourceCollection = get(this.userResources)?.[category]?.[source];
    if (!dataset) {
      return;
    }
    const datasetPatientId = get(dataset.patient).id;
    let patient = get(this.masterPatient).resource;
    let datasetPatientLinkIndex = patient.link.findIndex((link) => link.other.reference === `Patient/${datasetPatientId}`);
    if (datasetPatientLinkIndex > -1) {
      patient.link.splice(datasetPatientLinkIndex, 1);
    }
    if (patient.link.length === 0) {
      delete patient.link;
    }
    await this.createOrUpdateMasterPatient(patient);
    this.removeDatasetFromUserResources(category, source);
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

  async addOrReplaceDataset(dataset: ResourceRetrieveEvent) {
    if (get(this.userResources)?.[dataset.category]?.[dataset.source]) {
      this.deleteDataset(dataset.category, dataset.source);
    }
    let patientReference = await this.createDataset(dataset);
    let newDataset = await this.fetchDatasetFromPatientReference(patientReference);
    let patient = get(this.masterPatient).resource;
    patient.link = patient.link ?? [];
    patient.link.push({ other: { reference: patientReference }, type: "seealso" });
    await this.createOrUpdateMasterPatient(patient);
    this.addDatasetToUserResources(newDataset);
  }
}

export default FHIRDataService;
