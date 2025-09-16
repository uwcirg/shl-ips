/**
 * Class that encapsulates the data for a user including their demographics and associated resources stored in the intermediate FHIR server.
 * 
 * @property {Writable<UserDemographics[] | undefined>} userResources - The user's saved fhir resources
 * @property {UserDemographics} demographics - The user's demographic form information
 * @property {Writable<boolean>} patientFound - Whether or not a patient has been found on the FHIR server
 * 
 * @function loadUserData - Load in the user's SHL and FHIR data
 * @function syncDemographicsToPatient - Sync the user's demographics form data to the FHIR server
 * @function demographicsMatchPatient - Determine if the demographics form data matches the current patient
 * @function saveDemographicsAsPatient - Create or update a patient resource on the FHIR server based on the demographic store
 */

import { writable, type Writable } from "svelte/store";
import { ResourceCollection } from "$lib/utils/ResourceCollection";
import { INTERMEDIATE_FHIR_SERVER_BASE } from "$lib/config/config";
import { IAuthService, UserDemographics } from "$lib/utils/types";
import type { Resource } from "fhir/r4";
import { constructPatientResource } from "$lib/utils/util";

const identifierSystem = 'https://keycloak.cirg.uw.edu';

export class FHIRDataService {
  auth: IAuthService;

  userResources: ResourceCollection = new ResourceCollection();
  demographics: Writable<UserDemographics> = writable({});
  patientFound: Writable<boolean> = writable(false);
  loadingResources: Writable<boolean> = writable(false);

  constructor(auth: IAuthService) {
    this.auth = auth;
  }

  loadUserData(): void {
    this.loadingResources.set(true);
    this.retrieveUserResources().then((resources: Resource[]) => {
      if (resources) {
        this.userResources = new ResourceCollection();
        this.userResources.collection.addResources(resources);
        this.syncDemographicsToPatient();
      }
      this.loadingResources.set(false);
    });
  }
  
  private async retrieveUserResources(): Promise<Resource[]> {
    let userResources = [];
    const userAuth = this.auth.user.get();
    let patient = this.userResources.patient.get();
    if (!patient) {
      patient = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient?identifier=${identifierSystem}%7C${userAuth.sub}`, {cache: "no-store"})
      .then((response) => response.text())
      .then((data) => JSON.parse(data))
      .then((data) => {
        if (data?.total > 0) {
          return data.entry?.[0].resource;
        }
      });
    }

    if (patient) {
      this.patientFound.set(true);
      // TODO: track time last fetched and limit fetch to newer resources
      userResources = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient/${patient?.id}/$everything`, {cache: "no-store"})
      .then((response) => response.text())
      .then((data) => JSON.parse(data))
      .then((data) => {
        if (data?.total > 0) {
          return data.entry;
        }
      });
    } else {
      // make a placeholder patient to pre-fill demographic forms
      this.patientFound.set(false);
      patient = constructPatientResource({
        identifier: {
          system: identifierSystem,
          value: userAuth.sub
        },
        first: (userAuth.given_name || userAuth.firstName),
        last: (userAuth.family_name || userAuth.lastName),
      });
      userResources = [patient];
    }
    return userResources;
  }

  syncDemographicsToPatient() {
    const patient = this.userResources.patient.get();
    this.demographics.set({
      id: patient.id,
      first: patient.name?.[0].given?.[0],
      last: patient.name?.[0].family,
      dob: patient.birthDate,
      gender: patient.gender,
      address: patient.address?.[0].line,
      city: patient.address?.[0].city,
      state: patient.address?.[0].state,
      zip: patient.address?.[0].postalCode,
      country: patient.address?.[0].country,
      phone: patient.telecom?.[0].value,
    });
  }

  demographicsMatchPatient(patient: any): boolean {
    const demographics: UserDemographics = this.demographics.get();
    return (
      demographics.id == patient.id &&
      demographics.first == patient.name?.[0].given?.[0] &&
      demographics.last == patient.name?.[0].family &&
      demographics.dob == patient.birthDate &&
      demographics.gender == patient.gender &&
      demographics.address == patient.address?.[0].line &&
      demographics.city == patient.address?.[0].city &&
      demographics.state == patient.address?.[0].state &&
      demographics.zip == patient.address?.[0].postalCode &&
      demographics.country == patient.address?.[0].country &&
      demographics.phone == patient.telecom?.[0].value
    );
  }

  async saveDemographicsAsPatient(): Promise<void> {
    const demographics = this.demographics.get();
    const currentPatient = this.userResources.patient.get()
    let patientFromDemographics = constructPatientResource(demographics);
    let patientToSave;
    if (!patientFromDemographics.id) {
      let newPatient = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(patientFromDemographics)
      })
      .then((response) => response.text())
      .then((data) => JSON.parse(data));
      patientToSave = newPatient;
      this.patientFound.set(true);
    } else if (!this.demographicsMatchPatient(currentPatient)) {
      let updatedPatient = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/Patient/${patientFromDemographics.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/fhir+json'
        },
        body: JSON.stringify(patientFromDemographics)
      })
      .then((response) => response.json());
      patientToSave = updatedPatient;
    }
    
    if (!patientToSave) return; // Didn't need to create or update patient info
    
    this.userResources.collection.addResource(patientToSave);
    this.syncDemographicsToPatient();
  }
}

export default FHIRDataService;
