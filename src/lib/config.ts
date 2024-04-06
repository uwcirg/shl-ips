// import {PUBLIC_BASE_URL} from '$env/static/public';
import { dev } from '$app/environment';
import { toMilliseconds } from '$lib/util';

export const API_BASE = import.meta.env.VITE_API_BASE;

export const INTERMEDIATE_FHIR_SERVER_BASE = import.meta.env.VITE_INTERMEDIATE_FHIR_SERVER_BASE;

export const OIDC_BASE = import.meta.env.VITE_OIDC_SERVER_BASE;
export const CHECK_SESSION_IFRAME = import.meta.env.VITE_OIDC_CHECK_SESSION_IFRAME;
export const LOGOUT_URL = import.meta.env.VITE_OIDC_LOGOUT_ENDPOINT;
export const POST_LOGOUT_REDIRECT_URI = import.meta.env.VITE_POST_LOGOUT_REDIRECT_URI;

export const BACK_URL = import.meta.env.VITE_BACK_URL;

const timeout = (import.meta.env.VITE_INACTIVITY_TIMEOUT ?? "04:00:00").split(":").map((n) => Number(n));
export const INACTIVITY_TIMEOUT = toMilliseconds(timeout[0] ?? 0, timeout[1] ?? 0, timeout[2] ?? 0);

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
const SOF_REDIRECT_URI = `${window.location.origin}/share`;

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
    iss: import.meta.env.VITE_SOF_ISS,//"https://fhir-auth.inform.dev.cirg.uw.edu/fhir",
    clientId: import.meta.env.VITE_SOF_CLIENT_ID, // shl_creator
    scope: keycloakScope,
    redirect_uri: SOF_REDIRECT_URI,
    note: "Credentials provided"
  }
];

export const VIEWER_BASE = new URL(
  (import.meta.env.VITE_VIEWER_BASE || `/view${dev ? '/index.html' : ''}`)+'#',
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
