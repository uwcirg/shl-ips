import * as jose from 'jose';
import * as pako from 'pako';
import issuerKeys from '$lib/utils/issuer.private.jwks.json';
import type { Bundle, BundleEntry, Patient, Resource } from 'fhir/r4';
import type { DemographicFields, DateTimeFields, SHCFile } from '$lib/utils/types';

export const base64url = jose.base64url;

export function randomStringWithEntropy(entropy = 32): string {
  const b = new Uint8Array(entropy);
  crypto.getRandomValues(b);
  return base64url.encode(b);
}

export async function base64toBlob(base64:string, type="application/octet-stream") {
  let result = await fetch(`data:${type};base64,${base64}`);
  return window.URL.createObjectURL(await result.blob());
}

// Helper function to format dates as "dd-MMM-yyyy"
export function formatDate(dateStr?: string) {
  if (!dateStr) {
    return '??';
  }
  // Handle partial dates
  let options: Intl.DateTimeFormatOptions = {};
  const yearMatch = /^\d{4}/;               // "2023"
  const yearMonthMatch = /^\d{4}-\d{2}/;    // "2023-05"
  const fullDateMatch = /^\d{4}-\d{2}-\d{2}/; // "2023-05-10"
  if (yearMatch.test(dateStr)) {
    options.year = 'numeric';
  }
  if (yearMonthMatch.test(dateStr)) {
    options.month = 'short';
  }
  if (fullDateMatch.test(dateStr)) {
    options.day = '2-digit';
  }
  try {
    const date = new Date(dateStr);
    let result = date.toLocaleDateString('en-GB', options);
    if (result === 'Invalid Date') {
      return dateStr;
    }
    return result;
  } catch (e) {
    return dateStr;
  }
}

function lowerCaseFirst(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export function hasChoiceDTField(prefix: string, resource: Resource): boolean {
  return Object.keys(resource).some(k => k.startsWith(prefix));
}

export function choiceDTFields(prefix: string, resource: Resource): DateTimeFields {
  const prefixedFields = Object.keys(resource).filter(k => k.startsWith(prefix));
  const fields: DateTimeFields = prefixedFields.reduce((acc: DateTimeFields, k: string) => {
    acc[lowerCaseFirst(k.replace(prefix, ''))] = resource[k];
    return acc;
  }, {});
  return fields;
}

// For machine-readable content, use the reference in the Composition.section.entry to retrieve resource from Bundle
export function getEntry(entries: Array<BundleEntry>, reference: string) {
  let result;
  if (!entries) {
    return result;
  }
  for (let entry of entries) {
    if (entry.fullUrl?.includes(reference)) {
      return entry.resource;
    } else {
      // Attempt to match based on resource and uuid
      let splitReference = reference.split('/');
      let referenceId = splitReference?.pop();
      if (entry.resource?.resourceType && splitReference.includes(entry.resource?.resourceType) && referenceId) {
        if (entry.fullUrl?.includes(referenceId)) {
          return entry.resource;
        } else if (entry.resource?.id?.includes(referenceId)) {
          return entry.resource;
        }
      }
    }
  }

  if (!result) {
    console.log(`missing reference ${reference}`);
  }
  return result;
};

export function download(filename:string, text:string) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

export function getReferences(resourceContent: any, references: any[] | undefined=undefined): string[]{
    let referenceFieldKey = "reference";
    if (references === undefined) {
      references = [];
    }
    if (typeof resourceContent === "object") {
      for (let k in resourceContent) {
        if (k !== "subject" && k !== "patient") {
          if (k === referenceFieldKey && references !== undefined) {
            references.push(resourceContent[k]);
          } else {
            references = getReferences(resourceContent[k], references);
          }
        } 
      }
    }
    return references;
  }

export function getResourcesFromIPS(ips: Bundle) {
  let entries = ips.entry;
  let resources = [] as Resource[];
  if (!entries) return resources;
  entries.forEach((entry: BundleEntry) => {
      if (!entry.resource) return;
      // if (entry.resource.resourceType == 'Condition') return; // Omit conditions until ips fhir server is upgraded
      if (entry.resource.resourceType == 'Composition') return;

      entry.resource.id = entry.fullUrl;
      if ('extension' in entry.resource && entry.resource.extension) {
          entry.resource.extension = entry.resource.extension.filter(function(item) {
              return item.url !== "http://hl7.org/fhir/StructureDefinition/narrativeLink";
          })
      }
      resources.push(entry.resource);
  });
  return resources;
}

export function isSHCFile(object: any): object is SHCFile {
  return 'verifiableCredential' in object;
}

const exampleSigningKey = jose.importJWK(issuerKeys.keys[0]);
export async function signJws(payload: unknown) {
  const fields = { zip: 'DEF', alg: 'ES256', kid: issuerKeys.keys[0].kid };
  const body = pako.deflateRaw(
    JSON.stringify({
      iss: 'https://spec.smarthealth.cards/examples/issuer',
      nbf: new Date().getTime() / 1000,
      vc: {
        type: ['https://smarthealth.cards#health-card'],
        credentialSubject: {
          fhirVersion: '4.0.1',
          fhirBundle: payload
        }
      }
    })
  );

  const signed = new jose.CompactSign(body)
  .setProtectedHeader(fields)
  .sign(await exampleSigningKey);
  return signed;
}

export async function packageSHC(content:SHCFile | Bundle | undefined): Promise<SHCFile> {
  if (content != undefined && isSHCFile(content) && content.verifiableCredential) {
    return content;
  }

  const shc = await signJws(content);

  return { verifiableCredential: [shc] };
}

// Utility function to validate a URL
export function isValidUrl(url: string) {
  try {
      new URL(url);
      return true;
  } catch (e) {
      return false;
  }
}

export function constructPatientResource (props: DemographicFields = {}) {
  let patient: Patient = {
    resourceType: 'Patient',
    active: true
  };
  if (props.id) {
    patient.id = props.id;
  }
  if (props.first || props.last) {
    patient.name = [ {} ];
    if (props.first) patient.name[0].given = [props.first];
    if (props.last) patient.name[0].family = props.last;
  }
  if (props.gender) {
    patient.gender = props.gender;
  }
  if (props.phone || props.email) {
    patient.telecom = [];
    if (props.phone) {
      patient.telecom.push({ system: 'phone', value: props.phone });
    }
    if (props.email) {
      patient.telecom.push({ system: 'email', value: props.email });
    }
  }
  if (props.preferredLanguage || props.languages) {
    patient.communication = [];
    if (props.preferredLanguage) {
      patient.communication.push({ preferred: true, language: { text: props.preferredLanguage } });
    }
    if (props.languages) {
      props.languages.forEach(lang => {
        patient.communication.push({ language: { text: lang } });
      });
    }
  }
  if (props.dob) {
    patient.birthDate = props.dob;
  }
  let identifiers = [];
  if (props.mrn) {
    identifiers.push([
      {
        use: 'usual',
        type: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
              code: 'MR',
              display: 'Medical Record Number'
            }
          ],
          text: 'Medical Record Number'
        },
        system: 'http://hospital.smarthealthit.org',
        value: props.mrn
      }
    ]);
  }
  if (props.identifier) {
    identifiers.push([
      {
        system: props.identifier.system,
        value: props.identifier.value
      }
    ]);
  }
  if (identifiers.length > 0) {
    patient.identifier = identifiers;
  }

  if (props.address1 || props.address2 || props.city || props.state || props.zip || props.country) {
    patient.address = [{}];
    if (props.address1) patient.address[0].line = [props.address1];
    if (props.address2) patient.address[0].line = [...patient.address[0].line, props.address2];
    if (props.city) patient.address[0].city = props.city;
    if (props.state) patient.address[0].state = props.state;
    if (props.zip) patient.address[0].postalCode = props.zip;
    if (props.country) patient.address[0].country = props.country;
  }
  
  let extensions = [];
  if (props.religion) {
    extensions.push({
      "url" : "http://hl7.org/fhir/StructureDefinition/patient-religion",
      "valueCodeableConcept" : {
        "coding" : [ props.religion ]
      }
    });
  }
  if (props.culture) {
    extensions.push({
      "url" : "http://healthintersections.com.au/fhir/StructureDefinition/patient-cultural-background",
      "valueString" : props.culture
    });
  }
  if (props.community) {
    extensions.push({
      "url" : "http://hl7.org.au/fhir/StructureDefinition/community-affiliation",
      "valueString" : props.community
    });
  }
  if (props.pronouns) {
    extensions.push({
      "url" : "http://hl7.org/fhir/StructureDefinition/individual-pronouns",
      "valueCodeableConcept" : {
        "coding" : [ props.pronouns ]
      }
    });
  }
  if (props.sexCharacteristics) {
    extensions.push({
      "url" : "http://hl7.org.au/fhir/StructureDefinition/sex-characteristic-variation",
      "valueCodeableConcept" : {
        "coding" : [ props.sexCharacteristics ]
      }
    });
  }
  if (extensions.length > 0) {
    patient.extension = extensions;
  }

  return patient;
}

export function buildPatientSearchQuery(
  props: DemographicFields = {},
  callback: Function = ((q: string) => q)
) {
  let query = "?_count=1&";
  query += 'active=true&';
  query += props.dob ? `birthdate=${props.dob}&` : '';
  query += props.first ? `given=${props.first}&` : '';
  query += props.last ? `family=${props.last}&` : '';
  query += props.gender ? `gender=${props.gender}&` : '';
  query += props.mrn ? `identifier=${props.mrn}&` : '';
  query += props.phone ? `phone=${props.phone}&` : '';
  query += props.address1 || props.address2 ? `address=${(props.address1+' '+props.address2).trim().replaceAll(' ', '+')}&` : '';
  query += props.city ? `address-city=${props.city}&` : '';
  query += props.state ? `address-state=${props.state}&` : '';
  query += props.zip ? `address-postalcode=${props.zip}&` : '';
  query = query.substring(0, query.length - 1);
  
  query = callback(query);
  return query;
}