// import {PUBLIC_BASE_URL} from '$env/static/public';
import { dev } from '$app/environment';

export const API_BASE = import.meta.env.VITE_API_BASE;

export const INTERMEDIATE_FHIR_SERVER_BASE = import.meta.env.VITE_INTERMEDIATE_FHIR_SERVER_BASE;

export const VERSION_STRING = import.meta.env.VITE_VERSION_STRING;

export const SOF_HOSTS = [
  // {
  //   id: "epic-himss",
  //   name: "Epic - HIMSS Demo",
  //   url: "https://ihe.epic.com/Interconnect-FHIR/api/FHIR/R4",
  //   clientId: import.meta.env.VITE_EPIC_HIMSS_CLIENT_ID,
  //   note: "zwei / epic"
  // },
  // {
  //   id: "ecw-himss",
  //   name: "eClinicalWorks - HIMSS Demo",
  //   url: "https://fhirstagingsrv.eclinicalweb.com/fhir/r4/JCBJCD",
  //   clientId: import.meta.env.VITE_ECW_HIMSS_CLIENT_ID,
  //   note: "zhangwei / Cures@2022"
  // },
  {
    id: "epic",
    name: "Epic, UW Medicine Epic (production)",
    // url: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    // per https://open.epic.com/MyApps/Endpoints :
    url: "https://fhir.epic.medical.washington.edu/FHIR-Proxy/api/FHIR/R4",
    clientId: import.meta.env.VITE_EPIC_CLIENT_ID,
    note: "<a href='https://fhir.epic.com/Documentation?docId=testpatients' target='_blank' rel='noreferrer'>Test patient credentials <Icon name='box-arrow-up-right' /></a>"
  },
  { 
    id: "cerner",
    name: "Oracle Cerner Demo",
    url: "https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    clientId: import.meta.env.VITE_CERNER_CLIENT_ID,
    note: "<a href='https://docs.google.com/document/u/1/d/e/2PACX-1vQwyX3px4qi5t1O6_El6022zYt4ymKAWCrcgxcX5NvYGUJAkJ4WFwOnLoikow6rEccpFZzDWBdcBqsQ/pub' target='_blank' rel='noreferrer'>Test patient credentials <Icon name='box-arrow-up-right' /></a>"
  },
  {
    id: "smit",
    name: "SMART Health IT Demo",
    url: "https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMF0/fhir",
    clientId: "<no client id>",
    note: "Credentials provided"
  }
];

export const BEARER_AUTHORIZATION = {
  'Meditech': import.meta.env.VITE_MEDITECH_BEARER_TOKEN
}
export const SOF_REDIRECT_URI = '/create';
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
  'AllergyIntolerance',
  // 'MedicationStatement', // Not in EPIC USCDI R4
  'MedicationRequest',
  // 'Medication', // can't search by patient; "Only an _ID search is allowed."
  'Condition',
  'Encounter',
  // 'Observation', // "Must have either code or category."
  // 'Organization', // can't search by patient; "Only an _ID search is allowed."
  'Immunization',
  // 'Device',
  // 'DeviceUseStatement', // Not in EPIC USCDI R4
  'DiagnosticReport', // TODO change to subject
  // 'ImagingStudy', // Not in EPIC USCDI R4
  // 'Media', // Not in EPIC USCDI R4
  // 'Practitioner', // can't search by patient; "Either name, family, or identifier is a required parameter."
  // 'PractitionerRole',  // can't search by patient; "An identifier, practitioner, organization, location, or specialty parameter is required."
  'Procedure', // TODO change to subject
  // 'Specimen', // Not in EPIC USCDI R4
];

export const VIEWER_BASE = new URL(
  (import.meta.env.VITE_VIEWER_BASE ? import.meta.env.VITE_VIEWER_BASE : `/ips${dev ? '/index.html' : ''}`)+'#',
  window.location.href
).toString();
export const PATIENT_IPS = {
  'Dave deBronkart': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/16501/$summary',
  'Peter Kieth Jordan': 'https://terminz.azurewebsites.net/fhir/Patient/$summary?profile=http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips&identifier=https://standards.digital.health.nz/ns/nhi-id|NNJ9186&_format=json'
}
export const EXAMPLE_IPS = {
  'Maria SEATTLE Gravitate': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/14599/$summary',
  'Martha Mum': 'https://hl7-ips-server.hl7.org/fhir/Patient/15/$summary',
  'Meditech 1': 'https://dev-mtx-interop.meditech.com:443/v2/ips/STU1/Patient/f3b430be-1f8a-53d3-8261-4ffbafa05a61/$summary',
  // 'Meditech 2': 'https://dev-mtx-interop.meditech.com:443/v2/ips/STU1/Patient/9bad7dc5-47ad-5022-82e7-0cb0aab13ee9/$summary', // Error returned
  'Angela Roster': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/10965/$summary',
  'Horace Skelly': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/11142/$summary',
  'Anonymous': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/10999/$summary',
  'Desiree': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/Pat1-System2/$summary'
};
export const IPS_DEFAULT = 'Maria SEATTLE Gravitate';
