import * as jose from 'jose';
import * as pako from 'pako';
import issuerKeys from '$lib/utils/issuer.private.jwks.json';
import type { SHCFile } from '$lib/utils/types';
import type { Bundle, BundleEntry, Resource } from 'fhir/r4';

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
