import FHIR from 'fhirclient';
import {
    SOF_HOSTS,
    SOF_REDIRECT_URI,
    SOF_PATIENT_RESOURCES,
    SOF_RESOURCES } from '$lib/config/config';
import { getReferences } from '$lib/utils/util';

export { authorize, endSession, getResources, getResourcesWithReferences, activePatient, constructResourceUrl };

const patientResourceScope = SOF_PATIENT_RESOURCES.map(resourceType => `patient/${resourceType}.read`);
const resourceScope = patientResourceScope.join(" ");
const config = {
        clientId: '(ehr client id, populated later)', // clientId() is ignored at smit
        scope: `openid fhirUser launch/patient patient/*.read`,
        iss: '(authorization url, populated later)',
        redirect_uri: SOF_REDIRECT_URI
    };

let client;

async function authorize(inputFhirUrl, clientId, scope=undefined) {
    if (scope) {
        config.scope = scope;
    }
    config.iss = inputFhirUrl;
    config.clientId = clientId ?? "no clientId configured";
    config.pkceMode = "ifSupported";
    return FHIR.oauth2.authorize(config);
};

function constructResourceUrl(resourceType, patientId, endpoint='') {
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

async function requestResources(client, resourceType) {
    let endpoint = constructResourceUrl(resourceType, client.getPatientId());
    return client.request(endpoint, { flat: true }).then((result) => {
        let resourcesToPass = [];
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
    } else if (client.state.serverUrl === "https://ihe-nimbus.epic.com/Interconnect-FHIR/api/FHIR/R4") {
        resources = await client.request(`Patient/${pid}/$summary`).then((result) => {
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

    return resources;
}

async function getResourcesWithReferences(depth=1) {
    let resources = await getResources();
    if (resources === undefined) {
        return [];
    }
    let allResources = [].concat(...resources);
    let referenceMap = {};
    let retrievedResources = {};
    while (resources.length > 0 && depth > 0) {
        resources.forEach(resource => {
            let retrieved = `${resource.resourceType}/${resource.id}`;
            retrievedResources[retrieved] = true;
            let refs = getReferences(resource);
            for (let i=0; i<refs.length; i++) {
                referenceMap[refs[i]] = true;
            }
        });
        let referencedResources = Object.keys(referenceMap);
        let referencedResourcesToFetch = referencedResources.filter(x => {
            return (!(x in retrievedResources) && SOF_RESOURCES.indexOf(x.split('/')[0]) >= 0);
        });
        resources = (await Promise.allSettled(referencedResourcesToFetch.map(reference => {
            return client.request(reference, {flat:true});
        }))).filter(x => x.status == "fulfilled").map(x => x.value);
        allResources = allResources.concat(...resources);
        referenceMap = {};
        depth--;
    }
    return allResources;
}
