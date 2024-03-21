// import {PUBLIC_BASE_URL} from '$env/static/public';
import { dev } from '$app/environment';

export const API_BASE = ( window.globalConfig?.VITE_API_BASE ?? import.meta.env.VITE_API_BASE);

export const INTERMEDIATE_FHIR_SERVER_BASE = ( window.globalConfig?.VITE_INTERMEDIATE_FHIR_SERVER_BASE ?? import.meta.env.VITE_INTERMEDIATE_FHIR_SERVER_BASE);

export const FHIR_R4_EXTERNAL_ID_SYSTEM = ( window.globalConfig?.VITE_FHIR_R4_EXTERNAL_ID_SYSTEM ?? import.meta.env.VITE_FHIR_R4_EXTERNAL_ID_SYSTEM);

export const LOGOUT_URL = ( window.globalConfig?.VITE_LOGOUT_URL ?? import.meta.env.VITE_LOGOUT_URL);
export const BACK_URL = ( window.globalConfig?.VITE_BACK_URL ?? import.meta.env.VITE_BACK_URL);

export const SOF_RESOURCES = [
  'Patient',
  'AllergyIntolerance',
  // 'MedicationStatement', // Not in EPIC USCDI R4
  'MedicationRequest',
  'Medication', // can't search by patient; "Only an _ID search is allowed."
  'Condition',
  'Observation', // "Must have either code or category."
  'Organization', // can't search by patient; "Only an _ID search is allowed."
  'Immunization',
  'Device',
  // 'DeviceUseStatement', // Not in EPIC USCDI R4
  'DiagnosticReport', // TODO change to subject
  // 'ImagingStudy', // Not in EPIC USCDI R4
  // 'Media', // Not in EPIC USCDI R4
  'Practitioner', // can't search by patient; "Either name, family, or identifier is a required parameter."
  'PractitionerRole',  // can't search by patient; "An identifier, practitioner, organization, location, or specialty parameter is required."
  'Procedure', // TODO change to subject
  // 'Specimen', // Not in EPIC USCDI R4
];

export const SOF_PATIENT_RESOURCES = [
  'Patient',
  'DocumentReference',
  // 'AllergyIntolerance',
  // 'MedicationStatement', // Not in EPIC USCDI R4
  // 'MedicationRequest',
  // 'Medication', // can't search by patient; "Only an _ID search is allowed."
  // 'Condition',
  // 'Observation', // "Must have either code or category."
  // 'Organization', // can't search by patient; "Only an _ID search is allowed."
  // 'Immunization',
  // 'Device',
  // 'DeviceUseStatement', // Not in EPIC USCDI R4
  // 'DiagnosticReport', // TODO change to subject
  // 'ImagingStudy', // Not in EPIC USCDI R4
  // 'Media', // Not in EPIC USCDI R4
  // 'Practitioner', // can't search by patient; "Either name, family, or identifier is a required parameter."
  // 'PractitionerRole',  // can't search by patient; "An identifier, practitioner, organization, location, or specialty parameter is required."
  // 'Procedure', // TODO change to subject
  // 'Specimen', // Not in EPIC USCDI R4
];

export const RESOURCE_SCOPE = SOF_PATIENT_RESOURCES.map(resourceType => `patient/${resourceType}.read`).join(" ");
const keycloakScope = `openid online_access`;
const fullScope = `${keycloakScope} fhirUser ${RESOURCE_SCOPE}`;
const SOF_REDIRECT_URI = '/share';

export const SOF_HOSTS = [
  // {
  //   id: "smit",
  //   name: "SMART Health IT Demo",
  //   iss: "https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMF0/fhir",
  //   clientId: "<no client id>",
  //   scope: fullScope,
  //   redirect_uri: SOF_REDIRECT_URI,
  //   note: "Credentials provided"
  // },
  {
    id: "keycloak",
    name: "Let's Talk Tech Login",
    iss: ( window.globalConfig?.VITE_SOF_ISS ?? import.meta.env.VITE_SOF_ISS),//"https://fhir-auth.inform.dev.cirg.uw.edu/fhir",
    clientId: ( window.globalConfig?.VITE_SOF_CLIENT_ID ?? import.meta.env.VITE_SOF_CLIENT_ID), // shl_creator
    scope: keycloakScope,
    redirect_uri: SOF_REDIRECT_URI,
    note: "Credentials provided"
  }
];

export const VIEWER_BASE = new URL(
  (( window.globalConfig?.VITE_VIEWER_BASE ?? import.meta.env.VITE_VIEWER_BASE) ? ( window.globalConfig?.VITE_VIEWER_BASE ?? import.meta.env.VITE_VIEWER_BASE) : `/ips${dev ? '/index.html' : ''}`)+'#',
  window.location.href
).toString();
export const PATIENT_IPS = {
  'Dave deBronkart': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/11013/$summary'
}
export const EXAMPLE_IPS = {
  'Maria SEATTLE Gravitate': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/14599/$summary',
  'Peter Keith Jones': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/11013/$summary',
  'Angela Roster': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/10965/$summary',
  'Horace Skelly': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/11142/$summary',
  'Anonymous': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/10999/$summary',
  'Desiree': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/Pat1-System2/$summary'
};
export const IPS_DEFAULT = 'Maria SEATTLE Gravitate';
