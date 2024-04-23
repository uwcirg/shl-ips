import FHIR from 'fhirclient';
import { SOF_PATIENT_RESOURCES, SOF_RESOURCES, LOGOUT_URL, POST_LOGOUT_REDIRECT_URI } from './config.ts';

const patientResourceScope = SOF_PATIENT_RESOURCES.map(resourceType => `patient/${resourceType}.read`);
const resourceScope = patientResourceScope.join(" ");

export class SOFClient {
    client;
    configuration;
    patientId;

    constructor(configuration) {
        this.configuration = configuration;
    }

    async initialize() {
        try {
            // Initialize FHIR client
            this.client = await FHIR.oauth2.init(this.configuration);
            this.patientId = this.getKeyCloakUserID();
        } catch (error) {
            console.error('Error initializing FHIR client:', error);
        }
    }

    clearClient() {
        this.client = null;
    }

    reset() {
        this.clearClient();
        let keyRaw = sessionStorage.getItem('SMART_KEY');
        if (keyRaw) {
            let key = JSON.parse(keyRaw);
            sessionStorage.removeItem(key);
        }
        sessionStorage.removeItem('SMART_KEY');
    }

    logout() {
        let logout_url = this.getLogoutURL() ?? "";
        this.reset();
        if (logout_url !== "") {
            window.location.href = logout_url;
        } else {
            throw Error("Empty logout URL");
        }
    }

    getKeyCloakUserID() {
        let stateToken = this.client.getState("tokenResponse.access_token");
        if (stateToken) {
            // let state = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            let part = stateToken.split('.')[1];
            let decoded = window.atob(part);
            let state = JSON.parse(decoded);
            // let state = JSON.parse(window.btoa(stateToken.split('.')[1]));
            let keycloakUserId = state?.sub;
            this.patientId = keycloakUserId;
        }
        return this.patientId;
    }

    authorize(inputFhirUrl, clientId) {
        config.iss = inputFhirUrl;
        config.clientId = clientId ?? "no clientId configured";
        return FHIR.oauth2.authorize(config);
    };

    getLogoutURL() {
        let logoutUrl = LOGOUT_URL;
        let idToken = this.client.getState("tokenResponse.id_token");
        if (idToken) {
            logoutUrl = `${LOGOUT_URL}?id_token_hint=${idToken}&post_logout_redirect_uri=${new URL(POST_LOGOUT_REDIRECT_URI).toString()}`;
        }
        return logoutUrl;
    }

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
        let endpoint = (
            resourceType == 'Patient' 
            ? 'Patient?identifier=' 
            : `${resourceType}?_count=1000&_sort=-date&subject.identifier=`
            ) + "https://keycloak.ltt.cirg.uw.edu|" + this.getPatientID();
        return this.client.request({url: endpoint, headers: {'cache-control': 'no-cache'}}, { flat: true }).then((result) => {
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
        // if (!(SOF_PATIENT_RESOURCES.find('Binary') && SOF_PATIENT_RESOURCES.find('DocumentReference'))) {
        //     throw Error('Unable to access resources required to save SHL.');
        // }

        /* This SHL metadata DocumentReference:
        * links the SHL to the session
        * holds the managementToken to delete, update or renew the link
        * holds the key to include in the SHL url
        */
        const shlData = {
            id: shl.id,
            label: label,
            userId: shl.userId,
            sessionId: docRef.id,//shl.sessionId,
            managementToken: shl.managementToken,
            encryptionKey: shl.encryptionKey
        };
        const shlPayload = btoa(JSON.stringify(shlData));
        let shlDocRefInputs = {
            date: new Date().toISOString(),
            userId: shl.userId,
            documentReferenceId: docRef.id,
            data: shlPayload,
            label: label,
            created: shl.created
        };

        let shlDocRefTemplate = {
            "resourceType": "DocumentReference",
            "status": "current",
            "type": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": "34108-1",
                        "display": "SMART Health Link Metadata"
                    }
                ]
            },
            "subject": {
                "reference": `Patient?identifier=https%3A%2F%2Fkeycloak.ltt.cirg.uw.edu%7C${shl.userId}`
            },
            "date": shlDocRefInputs.date,
            "description": "SMART Health Link Metadata",
            "content": [
                {
                    "attachment": {
                        "contentType": "application/json",
                        "language": "en-US",
                        "data": shlPayload,
                        "title": label,
                    }
                }
            ],
            "context": {
                "related": [
                    {
                        "reference": `DocumentReference/${docRef.id}`
                    }
                ]
            }
        };
        let docRefResult = await this.client.create(shlDocRefTemplate);
        return shlData;
    }

    getClient() {
        return this.client;
    }

    getPatientID() {
        return this.patientId ?? this.getKeyCloakUserID();
    }

    async getResources() {
        const self = this;
        let pid = this.getPatientID();
        // TODO SOF: Bring back in once SMART Auth is set up?
        if (!pid) {
            console.error("No patient ID found");
            return [];
        }
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
