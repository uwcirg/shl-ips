import FHIR from 'fhirclient';
import { SOF_REDIRECT_URI, SOF_PATIENT_RESOURCES, SOF_RESOURCES } from './config';

export { authorize, retrieve, activePatient };

const patientResourceScope = SOF_PATIENT_RESOURCES.map(resourceType => `patient/${resourceType}.read`);
const resourceScope = patientResourceScope.join(" ");
const config = {
        // This client ID worked through 2023-04-17, and then I marked the app as ready for production. I think at that point I was assigned new prod & non-prod client ID's...
        clientId: '(ehr client id, populated later)', // clientId() is ignored at smit
        scope: `openid fhirUser launch/patient ${resourceScope} offline_access`,
        iss: '(authorization url, populated later)',
        redirect_uri: SOF_REDIRECT_URI
    };

let client;

function authorize(inputFhirUrl, clientId) {
    config.iss = inputFhirUrl;
    config.clientId = clientId ?? "no clientId configured";
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

async function requestResources(client, resourceType) {
    let endpoint = (resourceType == 'Patient' ? 'Patient/' : `${resourceType}?patient=`) + client.getPatientId();
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

async function retrieve() {
    client = await FHIR.oauth2.ready();
    let pid = client.getPatientId();
    if (!pid) {
        throw Error('No patient id found');
    }
    // Establish resource display methods
    let resources = await Promise.all(SOF_PATIENT_RESOURCES.map((resourceType) => {
        return requestResources(client, resourceType);
    }));
    let allResources = [].concat(...resources);
    let referenceMap = {};
    let retrievedResources = [];
    while (resources.length > 0) {
        console.log(resources);
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
            return client.request(reference, {flat:true});;
        }))).filter(x => x.status == "fulfilled").map(x => x.value);
        allResources = allResources.concat(...resources);
        referenceMap = {};
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