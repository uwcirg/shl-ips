import FHIR from 'fhirclient';
import { SOF_REDIRECT_URI, SOF_PATIENT_RESOURCES, SOF_RESOURCES } from '$lib/config';

export { authorize, getResources, getResourcesWithReferences, activePatient, constructResourceUrl };

const patientResourceScope = SOF_PATIENT_RESOURCES.map(resourceType => `patient/${resourceType}.read`);
const resourceScope = patientResourceScope.join(" ");
const config = {
        clientId: '(ehr client id, populated later)', // clientId() is ignored at smit
        scope: `openid fhirUser launch/patient ${resourceScope}`,
        iss: '(authorization url, populated later)',
        redirect_uri: SOF_REDIRECT_URI
    };

let client;

function authorize(inputFhirUrl, clientId) {
    config.iss = inputFhirUrl;
    config.clientId = clientId ?? "no clientId configured";
    config.pkceMode = "ifSupported";
    return FHIR.oauth2.authorize(config);
};

function getReferences(obj, references) {
    let key = "reference";
    if (references === undefined) {
      references = [];
    }
    if (typeof obj === "object") {
      for (let k in obj) {
        if (k !== "subject" && k !== "patient") {
          if (k === key && references !== undefined) {
            references.push(obj[k]);
          } else {
            references = getReferences(obj[k], references);
          }
        } 
      }
    } else if (obj instanceof Array) {
      for (let i=0; i < obj.length; i++) {
        references = getReferences(obj[i], references);
      }
    }
    return references;
  }

function constructResourceUrl(resourceType, patientId, endpoint='') {
    if (endpoint) {
        endpoint = `${endpoint}/`;
    }
    return `${endpoint}${resourceType == 'Patient' ? 'Patient/' : `${resourceType}?patient=`}${patientId}`;
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
        return client.getPatientId();
    }
    return null
}

async function getResources() {
    client = await FHIR.oauth2.ready();
    let pid = client.getPatientId();
    if (!pid) {
        console.error("No patient ID found");
        return undefined;
    }
    // Establish resource display methods
    let resources;
    if (client.state.clientId === "XfubBaEQzzHCOvgeB9Q7qZbg4QcK3Jro_65w5VWFRP8") {
        resources = (await Promise.allSettled(['Patient', 'Immunization'].map((resourceType) => {
            return requestResources(client, resourceType);
        }))).filter(x => x.status == "fulfilled").map(x => x.value);
    } else {
        resources = (await Promise.allSettled(SOF_PATIENT_RESOURCES.map((resourceType) => {
            return requestResources(client, resourceType);
        }))).filter(x => x.status == "fulfilled").map(x => x.value);
    }
   

    return resources;
}

async function getResourcesWithReferences(depth=1) {
    let resources = await getResources();
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

// Utility function to validate a URL
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}