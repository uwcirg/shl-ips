import FHIR from 'fhirclient';
import * as crypto from 'crypto';
import Handlebars from 'handlebars';
import { SOF_PATIENT_RESOURCES, SOF_RESOURCES } from './config.ts';
// import shlDocumentReference from './resourceTemplates.js';

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

    async postShl(shl, docRef, label) {
        // Check that a patient is logged in
        let pid = this.getPatientID();
        if (!pid) {
            throw Error('No valid patient session found.');
        }

        // Check that we can write to the server
        if (!(SOF_PATIENT_RESOURCES.find('Binary') && SOF_PATIENT_RESOURCES.find('DocumentReference'))) {
            throw Error('Unable to access resources required to save SHL.');
        }

        /* This SHL metadata DocumentReference:
        * links the SHL to the session
        * holds the managementToken to delete, update or renew the link
        * holds the key to include in the SHL url
        */
        const shlData = {
            id: shl.id,
            created: shl.created,
            patientId: shl.patientId,
            sessionId: shl.sessionId,
            managementToken: shl.managementToken,
            key: shl.key
        };
        const shlPayload = btoa(shlData);
        const shlPayloadHash = crypto.createHash('sha1').update(shlPayload).digest().toString('base64');
        let shlDocRefInputs = {
            date: new Date().toISOString(),
            patientId: shl.patientId,
            documentReferenceId: docRef,
            data: shlPayload,
            hash: shlPayloadHash,
            label: label,
            created: shl.created
        }
        const shlDocRefTemplate = Handlebars.compile(shlDocumentReference);
        let docRefResource = shlDocRefTemplate(shlDocRefInputs);
        let docRefResult = this.client.create(docRefResource);
    }

    getClient() {
        return this.client;
    }

    getPatientID() {
        return "ltt-test-patient";
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
