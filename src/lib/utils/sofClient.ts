import FHIR from 'fhirclient';
import {
    SOF_HOSTS,
    SOF_REDIRECT_URI,
    SOF_PATIENT_RESOURCES, 
    USCDI_RESOURCES} from '$lib/config/config';
import { getReferences, isIPSBundle } from '$lib/utils/util';
import type { BundleEntry, Resource } from 'fhir/r4';
import { getEntries } from './importNormalization';

export { authorize, endSession, getResources, activePatient, constructResourceUrl };

const patientResourceScope = SOF_PATIENT_RESOURCES.map(resourceType => `patient/${resourceType}.read`);
const resourceScope = patientResourceScope.join(" ");
const config: {
    clientId: string;
    scope: string;
    iss: string;
    redirect_uri: string;
    pkceMode?: string
} = {
        clientId: '(ehr client id, populated later)', // clientId() is ignored at smit
        scope: `openid fhirUser launch/patient patient/*.read`,
        iss: '(authorization url, populated later)',
        redirect_uri: SOF_REDIRECT_URI
    };

let client: any;

async function authorize(inputFhirUrl: string, clientId: string, options: {
    scope?: string;
    pkceMode?: string;
} = {}) {
    if (!inputFhirUrl) {
        throw Error('No FHIR server URL provided');
    }
    if (!clientId) {
        throw Error('No client ID provided');
    }
    if (options.scope) {
        config.scope = options.scope;
    }
    if (options.pkceMode) {
        config.pkceMode = options.pkceMode;
    }
    config.iss = inputFhirUrl;
    config.clientId = clientId;
    config.pkceMode = config.pkceMode ?? "ifSupported";
    return FHIR.oauth2.authorize(config);
};

function constructResourceUrl(resourceType: string, patientId: string, endpoint='') {
    if (endpoint) {
        endpoint = `${endpoint}/`;
    }
    endpoint = `${endpoint}${resourceType == 'Patient' ? 'Patient/' : `${resourceType}?patient=`}${patientId}`;
    if (resourceType === "Observation") {
        endpoint = `${endpoint}&category=laboratory,social-history,procedure`;
    }
    return endpoint;
}

function endSession() {
    let key = sessionStorage.getItem('SMART_KEY');
    if (key) {
        sessionStorage.removeItem(JSON.parse(key));
        sessionStorage.removeItem('SMART_KEY');
    }
}

async function requestResources(client: any, resourceType: string): Promise<any> {
    let endpoint = constructResourceUrl(resourceType, client.getPatientId());
    return client.request(endpoint, { flat: true }).then((result: Resource[]) => {
        let resourcesToPass: Resource[] = [];
        if (Array.isArray(result)) {
            result.forEach(resource => {
                if (resource === undefined || resource.resourceType != resourceType) return;
                resourcesToPass.push(resource);
            });
        } else {
            resourcesToPass.push(result);
        }
        return resourcesToPass;
    });
}

async function activePatient() {
    if (client === undefined) {
        client = await FHIR.oauth2.ready();
    }
    return client.getPatientId() ?? undefined;
}

async function getResources() {
    try {
        client = await FHIR.oauth2.ready();
    } catch (e) {
        throw Error('SMART authorization failed. The service you selected may be unavailable.')
    }
    let pid = client.getPatientId();
    if (!pid) {
        console.error("No patient ID found");
        throw Error('The service you selected did not return an ID for the authorized patient. Please try a different service.')
    }
    // Establish resource display methods
    let resources;
    if (client.state.clientId === "XfubBaEQzzHCOvgeB9Q7qZbg4QcK3Jro_65w5VWFRP8") {
        // Minimum required requests for eClinicalWorks HIMSS 2024 demo
        resources = (await Promise.allSettled(['Patient', 'Immunization'].map((resourceType) => {
            return requestResources(client, resourceType);
        }))).filter(x => x.status == "fulfilled").map(x => x.value);
    } else if ((client.state.serverUrl === "https://ihe-nimbus.epic.com/Interconnect-FHIR/api/FHIR/R4")
        || (client.state.serverUrl === "https://connectathon.epic.com/Interconnect-Fhir-OAuth/api/FHIR/R4"
        || (client.state.serverUrl === "https://ihe.epic.com/Interconnect-FHIR/api/FHIR/R4")
        )){
        resources = await client.request(`Patient/${pid}/$summary`).then((result: Resource | Resource[]) => {
            let resourcesToPass = [];
            if (Array.isArray(result)) {
                result.forEach(resource => {
                    if (resource === undefined) return;
                    resourcesToPass.push(resource);
                });
            } else {
                resourcesToPass.push(result);
            }
            return resourcesToPass;
        });
    } else {
        resources = (await Promise.allSettled(SOF_PATIENT_RESOURCES.map((resourceType) => {
            return requestResources(client, resourceType);
        }))).filter(x => x.status == "fulfilled").map(x => x.value);
    }
    resources = resources.flat();
    let resourcesWithReferences = await getResourceReferences(resources, USCDI_RESOURCES, 1);
    return resourcesWithReferences;
}

export async function completeConfidentialClientAuth(host: string, resourceList: string[], sofToken: any, authToken: string, code: string) {
    let tokenResult = await fetch(`/api/sof/${host}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ code, code_verifier: sofToken.codeVerifier }),
      })
      .then(response => {
        if (!response.ok) {
          throw Error('Token exchange failed');
        }
        return response.text();
      })
      .then(response => JSON.parse(response));
    
    if (!tokenResult) {
      throw Error('Token exchange failed');
    }
    const accessToken = tokenResult.access_token;
    const patientId = tokenResult.patient;
    console.log('Access Token:', accessToken);
    let resources;
    if (sofToken.serverUrl === "https://greenfield-prod-apis.meditech.com/v2/uscore/R4") {
        resources = await fetch(`${sofToken.serverUrl}/Patient/${patientId}/$summary`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        })
            .then(response => response.json())
            .then((result: Resource | Resource[]) => {
                if (isIPSBundle(result)) {
                    return getEntries(result.entry);
                }
            });
    } else {
        let patient = await fetch(`${sofToken.serverUrl}/Patient/${patientId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then(response => response.json())
          .then(patientData => {
            console.log('Patient Data:', patientData);
            return patientData;
          });
            
        resources = (await Promise.allSettled(resourceList.map((resourceType: string) => {
          return fetch(`${sofToken.serverUrl}/${resourceType}?patient=${patientId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          .then(response => response.json())
          .then(data => {
            console.log(`${resourceType} Data:`, data);
            if (data.resourceType === 'Bundle') {
              return data.entry.map((e: BundleEntry) => e.resource).filter((r: Resource) => r.resourceType === resourceType);
            } else if (resourceList.includes(data.resourceType)) {
              return [data];
            }
            throw Error (`Unexpected resource type ${data.resourceType}`);
          });
        }))).filter(x => x.status == "fulfilled").map(x => x.value);
        
        resources = resources.flat();
        let resourcesWithReferences = await getResourceReferences(resources, USCDI_RESOURCES, 1, accessToken, sofToken.serverUrl);
        resources = [patient, ...resourcesWithReferences];
        return resources;
    }
}

async function getResourceReferences(resources: Resource[], allowedResourceTypes: string[], depth = 1, token:string|undefined = undefined, url:string|undefined = undefined) {
    let allResources = JSON.parse(JSON.stringify(resources));
    let referenceMap = {} as { [key: string]: boolean };
    let retrievedResources = {} as { [key: string]: boolean };
    while (resources.length > 0 && depth > 0) {
        for (let resource of resources) {
            let retrieved = `${resource.resourceType}/${resource.id}`;
            retrievedResources[retrieved] = true;
            let refs = getReferences(resource);
            for (let i = 0; i < refs.length; i++) {
                referenceMap[refs[i]] = true;
            }
        }
        let referencedResources = Object.keys(referenceMap);
        let referencedResourcesToFetch = referencedResources.filter(x => {
            return (!(x in retrievedResources) && allowedResourceTypes.indexOf(x.split('/')[0]) >= 0);
        });
        let fetchFunc;
        if (token && url) {
            let headers: HeadersInit = {};
            headers.authorization = `Bearer ${token}`;
            fetchFunc = (reference: string) => {
                return fetch(`${url}/${reference}`, {
                    headers: headers
                }).then(response => response.json());
            };
        } else {
            fetchFunc = (reference: string) => {
                return client.request(reference, { flat: true });
            };
        }
        resources = (await Promise.allSettled(referencedResourcesToFetch.map(fetchFunc)))
            .filter(x => x.status == "fulfilled" && x.value.resourceType && x.value.resourceType !== "OperationOutcome")
            .map(x => x.value);
        allResources = allResources.concat(...resources);
        referenceMap = {};
        depth--;
    }
    return allResources;
}

