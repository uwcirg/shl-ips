import FHIR from 'fhirclient';
import { SOF_PATIENT_RESOURCES, SOF_RESOURCES } from './config.ts';

const patientResourceScope = SOF_PATIENT_RESOURCES.map(resourceType => `patient/${resourceType}.read`);
const resourceScope = patientResourceScope.join(" ");

export class SOFClient {
    client;
    configuration;

    constructor(configuration) {
        this.configuration = configuration;
    }

    async initialize() {
        try {
            // Initialize FHIR client
            this.client = await FHIR.oauth2.init(this.configuration);
        } catch (error) {
            console.error('Error initializing FHIR client:', error);
        }
    }

    authorize(inputFhirUrl, clientId) {
        config.iss = inputFhirUrl;
        config.clientId = clientId ?? "no clientId configured";
        return FHIR.oauth2.authorize(config);
    };

    getReferences(obj, references) {
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
                references = this.getReferences(obj[k], references);
            }
            } 
        }
        } else if (obj instanceof Array) {
        for (let i=0; i < obj.length; i++) {
            references = this.getReferences(obj[i], references);
        }
        }
        return references;
    }

    async requestResources(resourceType) {
        let self = this;
        let endpoint = (resourceType == 'Patient' ? 'Patient' : `${resourceType}`);//?patient=`) + client.getPatientId();
        return this.client.request(endpoint, { flat: true }).then((result) => {
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
        }).catch(async (error) => {
            self.initialize();
            throw error;
        });
    }

    getClient() {
        return this.client;
    }

    getPatientID() {
        return "a473c2b3-4f7d-409e-8feb-b3479ab9e849";
        return this.client.getPatientId();
    }

    async getResources() {
        const self = this;
        let pid = this.getPatientID();
        // TODO SOF: Bring back in once SMART Auth is set up?
        // if (!pid) {
        //     console.error("No patient ID found");
        //     return undefined;
        // }
        // Establish resource display methods
        let resources = (await Promise.allSettled(SOF_PATIENT_RESOURCES.map((resourceType) => {
            return self.requestResources(resourceType);
        }))).filter(x => x.status == "fulfilled").map(x => x.value);

        return [].concat(...resources);
    }

    async getResourcesWithReferences(depth=1) {
        const self = this;
        let resources = await this.getResources();
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
                return self.client.request(reference, {flat:true});
            }))).filter(x => x.status == "fulfilled").map(x => x.value);
            allResources = allResources.concat(...resources);
            referenceMap = {};
            depth--;
        }

        return allResources;
    }

    endSession() {
        let key = sessionStorage.getItem('SMART_KEY');
        if (key) {
            sessionStorage.removeItem(JSON.parse(key));
            sessionStorage.removeItem('SMART_KEY');
        }
    }

    // Utility function to validate a URL
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch (e) {
            return false;
        }
    }
}
