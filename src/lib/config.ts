// import {PUBLIC_BASE_URL} from '$env/static/public';

export const API_BASE = import.meta.env.VITE_API_BASE;

export const INTERMEDIATE_FHIR_SERVER_BASE = import.meta.env.VITE_INTERMEDIATE_FHIR_SERVER_BASE;

export const VERSION_STRING = import.meta.env.VITE_VERSION_STRING;

export const AUTH_URL = import.meta.env.VITE_AUTH_URL;
export const AUTH_CLIENT_ID = import.meta.env.VITE_AUTH_CLIENT_ID;
export const AUTH_REDIRECT_URI = import.meta.env.VITE_AUTH_REDIRECT_URI;
export const AUTH_SILENT_REDIRECT_URI = import.meta.env.VITE_AUTH_SILENT_REDIRECT_URI;
export const AUTH_POST_LOGOUT_URI = import.meta.env.VITE_AUTH_POST_LOGOUT_URI;

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
    id: "epic-himss",
    name: "Epic - HIMSS Demo",
    url: "https://ihe-nimbus.epic.com/Interconnect-FHIR/api/FHIR/R4",
    clientId: import.meta.env.VITE_EPIC_CLIENT_ID,
    note: "user / pass"
  },
  {
    id: "epic",
    name: "Epic Demo",
    url: "https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4",
    clientId: import.meta.env.VITE_EPIC_CLIENT_ID,
    note: "fhircamila / epicepic1 <br> <a style='color: grey; font-size: small' href='https://fhir.epic.com/Documentation?docId=testpatients' target='_blank' rel='noreferrer'>More credentials <span style='vertical-align: text-bottom; font-size: x-small' class='bi-chevron-double-right' /></a>"
  },
  { 
    id: "cerner",
    name: "Oracle Cerner Demo",
    url: "https://fhir-myrecord.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d",
    clientId: import.meta.env.VITE_CERNER_CLIENT_ID,
    note: "nancysmart / Cerner01 <br> <a style='color: grey; font-size: small' href='https://docs.google.com/document/u/1/d/e/2PACX-1vQwyX3px4qi5t1O6_El6022zYt4ymKAWCrcgxcX5NvYGUJAkJ4WFwOnLoikow6rEccpFZzDWBdcBqsQ/pub' target='_blank' rel='noreferrer'>More credentials <span style='vertical-align: text-bottom; font-size: x-small' class='bi-chevron-double-right' /></a>"
  },
  {
    id: "smit",
    name: "SMART Health IT Demo",
    url: "https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMF0/fhir",
    clientId: "<no client id>",
    note: "Credentials provided"
  },
];

export const CARIN_HOSTS = [
  {
    id: "aetna",
    name: "AETNA Insurance Sandbox",
    url: "https://vteapif1.aetna.com/fhirdemo/v2/patientaccess",
    clientId: import.meta.env.VITE_AETNA_CLIENT_ID,
    note: "VTETestUser01 / FHIRdemo2020"
  },
  {
    id: "cpcds",
    name: "CPCDS Demo",
    url: "https://cpcds-server.lantanagroup.com/fhir",
    clientId: import.meta.env.VITE_CPCDS_CLIENT_ID,
    note: "Patient1 / password"
  },
  {
    id: "inferno",
    name: "Inferno Test Suite",
    url: "https://inferno-qa.healthit.gov/suites/custom/c4bb_v200_client",
    clientId: import.meta.env.VITE_INFERNO_CLIENT_ID,
    note: "Credentials provided"
  },
  // {
  //   id: "carefirst",
  //   name: "CareFirst",
  //   url: "https://chpdc-api-sita.carefirst.com/v1/fhir/patientaccess",
  //   // url: "https://chpmd-api-sita.carefirst.com/v1/fhir/patientaccess",
  //   // url: "https://dsnp-api-sita.carefirst.com/v1/fhir/patientaccess",
  //   // url: "https://mapd-api-sita.carefirst.com/v1/fhir/patientaccess",
  //   // url: "https://mhbe-api-sita.carefirst.com/v1/fhir/patientaccess",
  //   // url: "https://egwp-api-sita.carefirst.com/v1/fhir/patientaccess",
  //   clientId: import.meta.env.VITE_CAREFIRST_CLIENT_ID,
  //   note: "Credentials provided"
  // },
]

export const BEARER_AUTHORIZATION = {
  'Meditech': import.meta.env.VITE_MEDITECH_BEARER_TOKEN,
  'EpicHIMSS': import.meta.env.VITE_EPIC_CLIENT_ID
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
  'QuestionnaireResponse',
];

export const SOF_PATIENT_RESOURCES = [
  'Patient',
  'AllergyIntolerance',
  // 'MedicationStatement', // Not in EPIC USCDI R4
  'MedicationRequest',
  // 'Medication', // Pulled in via references - can't search by patient; "Only an _ID search is allowed."
  'Condition',
  'Encounter',
  // 'Observation', // Handle specially for IPS codes - "Must have either code or category."
  // 'Organization', // Pulled in via references - can't search by patient; "Only an _ID search is allowed."
  'Immunization',
  // 'Device',
  // 'DeviceUseStatement', // Not in EPIC USCDI R4
  'DiagnosticReport', // TODO change to subject
  // 'ImagingStudy', // Not in EPIC USCDI R4
  // 'Media', // Not in EPIC USCDI R4
  // 'Practitioner', // Pulled in via references - can't search by patient; "Either name, family, or identifier is a required parameter."
  // 'PractitionerRole',  // Pulled in via references - can't search by patient; "An identifier, practitioner, organization, location, or specialty parameter is required."
  'Procedure', // TODO change to subject
  // 'Specimen', // Not in EPIC USCDI R4
  'QuestionnaireResponse',
];

export const CARIN_RESOURCES = [
  'Patient',
  'Coverage',
  'Practitioner',
  'Organization',
  'RelatedPerson',
  'ExplanationOfBenefit',
];

export const VIEWER_BASE = new URL(
  (import.meta.env.VITE_VIEWER_BASE ? import.meta.env.VITE_VIEWER_BASE : `/ips`)+'#',
  window.location.href
).toString();
export const SHOW_VIEWER_DEMO = import.meta.env.VITE_SHOW_VIEWER_DEMO;

export const PATIENT_IPS = {
  'Dave deBronkart': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/16501/$summary',
  'Peter Kieth Jordan': 'https://terminz.azurewebsites.net/fhir/Patient/$summary?profile=http://hl7.org/fhir/uv/ips/StructureDefinition/Bundle-uv-ips&identifier=https://standards.digital.health.nz/ns/nhi-id|NNJ9186&_format=json'
}
export const EXAMPLE_IPS = {
  'Epic HIMSS': 'https://ihe-nimbus.epic.com/Interconnect-FHIR-Open/api/FHIR/R4/Patient/e1o-b5iIsAPxRiD2Ct8KekQ3/$summary',
  'Maria SEATTLE Gravitate': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/14599/$summary',
  'Peter Kieth Jordan': 'https://raw.githubusercontent.com/jddamore/IPSviewer/4eedba9df34afbf3eb20d98c49d36afc7f9ce104/samples/connectathon_Jan2025/new_IPS_Example.json',
  'Johanna Petronella Maria (Jo) van Putten-van der Giessen': "https://raw.githubusercontent.com/jddamore/IPSviewer/4eedba9df34afbf3eb20d98c49d36afc7f9ce104/samples/connectathon_archive/NL_core_patient_01.json",
  'Martha Mum': 'https://hl7-ips-server.hl7.org/fhir/Patient/15/$summary',
  'MEDITECH 1': 'https://dev-mtx-interop.meditech.com:443/v2/ips/STU1/Patient/f3b430be-1f8a-53d3-8261-4ffbafa05a61/$summary',
  // 'MEDITECH 2': 'https://dev-mtx-interop.meditech.com:443/v2/ips/STU1/Patient/9bad7dc5-47ad-5022-82e7-0cb0aab13ee9/$summary', // Error returned
  'Angela Roster': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/10965/$summary',
  'Horace Skelly': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/11142/$summary',
  'Anonymous': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/10999/$summary',
  'Desiree': 'https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient/Pat1-System2/$summary',
  // 2025-01 Connectathon PACIO track:
  'Jenny Mosley': 'https://hapi.fhir.org/baseR4/Patient/patientJM1/$summary'
};
export const IPS_DEFAULT = 'Maria SEATTLE Gravitate';
