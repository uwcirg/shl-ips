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
import { INTERMEDIATE_FHIR_SERVER_BASE } from "$lib/config/config";
import type { IAuthService, UserDemographics } from "$lib/utils/types";
import { ResourceHelper } from "$lib/utils/ResourceHelper";
import type { Coding, Patient, Resource } from "fhir/r4";
import { constructPatientResource, getDemographicsFromPatient } from "$lib/utils/util";
import { uploadResources, getPatientReferenceFromTransactionResponse } from "$lib/utils/resourceUploader";

const IDENTIFIER_SYSTEM = 'http://keycloak.cirg.uw.edu';
const CATEGORY_SYSTEM = 'http://fhir.wahealthsummary.cirg.uw.edu/CodeSystem/wahealthsummary-category';
const PLACEHOLDER_SYSTEM = 'http://fhir.wahealthsummary.cirg.uw.edu/CodeSystem/wahealthsummary-placeholder';

export type UserResourceDataset = {
  category: Coding,
  source: Coding,
  collection: ResourceCollection,
}

export class FHIRDataService {
  auth: IAuthService;

  userResources: Writable<Record<string, UserResourceDataset>> = writable({});
  masterPatient: Writable<ResourceHelper> = writable({});
  demographics: Writable<UserDemographics> = writable({});
  patientLinks: Readable<Array<any>> = derived(this.masterPatient, ($masterPatient) => $masterPatient.resource.link);

  constructor(auth: IAuthService) {
    this.auth = auth;
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
    resourceCollections.map(this.addDatasetToUserResources);
  }

  private async fetchUserResources(): Promise<Array<Array<Resource>>> {
    let patient: ResourceHelper = await this.getOrCreateMasterPatient();
    let patientLinks = patient.resource.link;
    if (patientLinks?.length > 0) {
      let userCategoryDatasetResults = await Promise.allSettled(patientLinks.map((link) => {
        let datasetPatientReference = link.other.reference;
        return this.fetchDatasetFromPatientReference(datasetPatientReference);
      }));
      let userCategoryDatasets = userCategoryDatasetResults.filter((result) => result.status === 'fulfilled').map((result) => result.value);
      return userCategoryDatasets;
    }
    return [];
  }

  async fetchDatasetFromPatientReference(patientReference: string): Promise<Array<Resource>> {
    return fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/${patientReference}/$everything`, {cache: "no-store"})
      .then((response) => response.text())
      .then((data) => JSON.parse(data))
      .then((data) => {
        if (data?.total > 0) {
          return data.entry.map((entry) => entry.resource);
        }
      });
  }

  async fetchPatient(): Promise<ResourceHelper | undefined> {
    let patient = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient?identifier=${IDENTIFIER_SYSTEM}%7C${get(this.auth.userId)}`, {cache: "no-store"})
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
    if (get(this.masterPatient).id) {
      patient.id = get(this.masterPatient).id;
      let updatedPatient = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient/${patient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/fhir+json'
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
          'Content-Type': 'application/fhir+json'
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
      identifier: {
        system: IDENTIFIER_SYSTEM,
        value: userAuthProfile.sub
      },
      first: (userAuthProfile.given_name || userAuthProfile.firstName),
      last: (userAuthProfile.family_name || userAuthProfile.lastName),
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
    return this.createOrUpdateMasterPatient(patientFromDemographics);
  }

  generateCategoryPlaceholderPatient(): Promise<Resource> {
    const masterPatientResource = get(this.masterPatient).resource;
    let patient = constructPatientResource({
      first: masterPatientResource.name?.[0].given?.[0],
      last: masterPatientResource.name?.[0].family,
    });
    patient.meta = patient.meta ?? {};
    patient.meta.tag = patient.meta.tag ?? [];
    patient.meta.tag.push({
      url: PLACEHOLDER_SYSTEM,
      code: 'placeholder-patient'
    });
    let patientReference = `Patient/${masterPatientResource.id}`;
    patient.link = { other: { reference: patientReference }, type: "replaced-by" }
    return patient;
  }

  addDatasetToUserResources(resourceList: Resource[]): void {
    if (resourceList.length > 0) {
      let collection = new ResourceCollection(resourceList);
      let patient = get(collection.patient);
      if (!patient) {
        throw new Error('No patient resource found in resource collection');
      }
      let categories = patient.meta.tag.filter((tag) => tag.system === CATEGORY_SYSTEM);
      if (categories.length === 0) {
        throw new Error('No category tag found in patient resource');
      }
      let category = categories[0];
      let source = patient.meta.source;
      let dataset = {
        category,
        source,
        collection
      };
      this.userResources.update((categoryMap) => {
        categoryMap[category.code] = dataset;
        return { ...categoryMap };
      });
    }
  }

  removeDatasetFromUserResources(category: string) {
    this.userResources.update((categoryMap) => {
      delete categoryMap[category];
      return { ...categoryMap };
    })
  }


  async createDataset(resources: Resource[], category: string, source: string): Promise<string> {
    let patient = resources.find((resource) => resource.resourceType === "Patient");
    if (!patient) {
      patient = this.generateCategoryPlaceholderPatient();
      resources = [ patient, ...resources ];
    }
    patient.meta = patient.meta ?? {};
    patient.meta.tag = patient.meta.tag ?? [];
    patient.meta.tag.push({ system: CATEGORY_SYSTEM, code: category });
    patient.meta.source = source;
    let transactionResponse = await uploadResources(resources);
    let patientReference = await getPatientReferenceFromTransactionResponse(transactionResponse);
    return patientReference;
  }

  async deleteDataset(category: string): Promise<void> {
    let dataset: UserResourceDataset = get(this.userResources)[category];
    if (!dataset) {
      return;
    }
    const datasetPatientId = get(dataset.collection.patient).id;
    let deleteResult = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient/${datasetPatientId}?_cascade=delete`, {
      method: 'DELETE'
    });
    if (deleteResult.ok) {
      let patient = get(this.masterPatient).resource;
      let datasetPatientLinkIndex = patient.link.findIndex((link) => link.other.reference === `Patient/${datasetPatientId}`);
      if (datasetPatientLinkIndex > -1) {
        patient.link.splice(datasetPatientLinkIndex, 1);
      }
      if (patient.link.length === 0) {
        delete patient.link;
      }
      await this.createOrUpdateMasterPatient(patient);
      this.removeDatasetFromUserResources(category);
    }
  }

  async addOrReplaceDataset(resources: Resource[], category: string, source: string) {
    let patientReference = await this.createDataset(resources, category, source);
    let newDataset = await this.fetchDatasetFromPatientReference(patientReference);
    if (get(this.userResources)[category]) {
      this.deleteDataset(category);
    }
    let patient = get(this.masterPatient).resource;
    patient.link = patient.link ?? [];
    patient.link.push({ other: { reference: patientReference }, type: "seealso" });
    await this.createOrUpdateMasterPatient(patient);
    this.addDatasetToUserResources(newDataset);
  }
}

export default FHIRDataService;
