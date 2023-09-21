import {
    INTERMEDIATE_FHIR_SERVER_BASE,
    RESOURCES_TO_LOAD_KEY,
    PATIENT_REFERENCE_KEY,
    IPS_URL_KEY,
 } from './config';

// This is both allowable and reverse order of loading
const allowableResourceTypes = [
    //'Patient', this is loaded separately
    'Organization',
    'Practitioner',
    'Device',
    'Medication',
    'PractitionerRole',
    'Encounter',
    'DeviceUseStatement',
    'Media',
    'Specimen',
    'AllergyIntolerance',
    // 'CarePlan', Still needs some work for referential integrity
    'ClinicalImpression',
    'Consent',
    'Condition',
    'Immunization',
    // 'Procedure', Removed until hapi server thymeleaf fixes are available
    'Observation',
    'DiagnosticReport',
    'MedicationRequest',
    'MedicationStatement'
];

export function getIPSResources(ips) {
    let entries = ips.entry;
    let resources = [];
    entries.forEach((entry) => {
        if (entry.resource.resourceType == 'Condition') return;

        entry.resource.id = entry.fullUrl;
        if (entry.resource.extension) {
            entry.resource.extension = entry.resource.extension.filter(function(item) {
                return item.url !== "http://hl7.org/fhir/StructureDefinition/narrativeLink";
            })
        }
        resources.push(entry.resource);
    });
    return resources;
}

export function prepareResources(resources) {
    let resourcesToLoad = [];
    let queuedResources = sessionStorage.getItem(RESOURCES_TO_LOAD_KEY);
    if (queuedResources) {
        resourcesToLoad = JSON.parse(queuedResources);
    }
    let Patient = sessionStorage.getItem(PATIENT_REFERENCE_KEY);
    if (!Patient) {
        for (let i = 0; i < resources.length; i++) {
            let resource = resources[i];
            if (resource.resourceType == 'Patient') {
                Patient = `${resource.resourceType}/${resource.id}`
                sessionStorage.setItem(PATIENT_REFERENCE_KEY, Patient);
                resourcesToLoad.push(resource);
                break;
            }
        }
    }
    for (let i = 0; i < resources.length; i++) {
        let resource = resources[i];
        if (Patient && resource.resourceType == 'Patient') {
            continue;
        }
        if (resource.subject) {
            resource.subject.reference = Patient;
        } else if (resource.patient) {
            resource.patient.reference = Patient;
        }
        let newResource = checkResource(resource);
        if (newResource != null) {
            resourcesToLoad.push(newResource);
        }
    }
    // TODO Sort resource list
    sessionStorage.setItem(RESOURCES_TO_LOAD_KEY, JSON.stringify(resourcesToLoad));
    return resourcesToLoad;
}

// Create Bundle and POST
export async function uploadResources() {
    let queuedResources = JSON.parse(sessionStorage.getItem(RESOURCES_TO_LOAD_KEY));
    let entries = [];
    for (let i = 0; i < queuedResources.length; i++) {
        let resource = queuedResources[i];
        let entry = {
            request: {
                method: "POST",
                url: resource.resourceType
            },
            resource: resource
        };
        entries.push(entry);
    }
    let bundle = {
        resourceType: "Bundle",
        type: "transaction",
        entry: entries
    };

    return await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json+fhir',
                // Add any additional headers if needed
            },
            body: JSON.stringify(bundle),
        }).then((response) => {
            return response.json()
        }).then((body) => {
            let IPSURL = "";
            body.entry.forEach(entry => {
                if (entry.response.location.startsWith('Patient')) {
                    let createdPatient = entry.response.location.split('/_history')[0];
                    IPSURL = `${INTERMEDIATE_FHIR_SERVER_BASE}/${createdPatient}/$summary`;
                }
                console.log(entry.response.outcome.issue[0].diagnostics);
            });
            sessionStorage.setItem(IPS_URL_KEY, IPSURL);
            return IPSURL;
        });
}

// export async function uploadResources() {
//     if (!Patient) {
//         for (let i = 0; i < resourcesToLoad.length; i++) {
//             if (resourcesToLoad[i].resourceType === 'Patient') {
//                 let data = resourcesToLoad[i];
//                 resourcesToLoad.splice(i, 1);
//                 upload(data, function () {
//                     uploadResources();
//                 });
//                 break;
//             }
//         }
//     } else {
//         for (let i = 0; i < allowableResourceTypes.length; i++) {
//             for (let j = 0; j < resourcesToLoad.length; j++) {
//                 if (allowableResourceTypes[i] === resourcesToLoad[j].resourceType) {
//                     resourcesToLoad[j].loadingOrder = i;
//                 }
//             }
//         }
//         arrayLoad();
//         // sessionStorage.removeItem(SESSION_STORAGE_KEY);
//     }
//     return await Promise.all(uploads).then((results) => {
//         return `${INTERMEDIATE_FHIR_SERVER_BASE}/${Patient}`;
//     });
// }

function checkResource(data) {
    if (data.resourceType && allowableResourceTypes.includes(data.resourceType)) {
        return data;
    } else if (data.resourceType === 'Patient') {
        return data;
    } else if (data.resourceType && data.resourceType === 'Bundle') {
        if (data.entry) {
            for (let i = 0; i < data.entry.length; i++) {
                if (data.entry[i].resource && data.entry[i].resource.resourceType && allowableResourceTypes.includes(data.entry[i].resource.resourceType)) {
                    if (data.entry[i].fullUrl) {
                        data.entry[i].resource.fullUrl = data.entry[i].fullUrl;
                    }
                    return data.entry[i].resource;
                } else if (data.entry[i].resource && data.entry[i].resource.resourceType && data.entry[i].resource.resourceType === 'Patient') {
                    return data.entry[i].resource;
                } else {
                    console.log(`skipping ${data.entry[i].resource.resourceType}`);
                    return null;
                }
            }
        }
    } else {
        console.log(`skipping ${data.resourceType}`);
        return null;
    }
}

// function upload(data, cb) {
//     let fullUrl = data.fullUrl;
//     delete data.fullUrl;
//     uploads.push(fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/${data.resourceType}`, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             // Add any additional headers if needed
//         },
//         body: JSON.stringify(data),
//     }).then((response) => {
//         if (!response.ok) {
//             throw new Error('Network response was not ok');
//         } else if (response.status !== 201) {
//             throw new Error('Reponse ok, but resource was not loaded');
//         }
//         return response.json();
//     }).then((body) => {
//         hashMap[`${data.resourceType}/${data.id}`] = `${data.resourceType}/${body.id}`;
//         hashMap[`${fullUrl}`] = `${data.resourceType}/${body.id}`;
//         if (data.resourceType === 'Patient') {
//             Patient = `${data.resourceType}/${body.id}`;
//         }
//         cb();
//     }).catch((error) => {
//         console.error(`Failed to load ${data.resourceType}/${data.id}`);
//         console.error(error);
//         cb();
//     }));
// }

// function arrayLoad() {
//     if (resourcesToLoad.length) {
//         resourcesToLoad.sort(function (a, b) { return b.loadingOrder - a.loadingOrder });
//         // console.log(pd.json(resourcesToLoad));
//         let nextObject = resourcesToLoad.pop();
//         delete nextObject.loadingOrder;
//         if (nextObject.subject) {
//             nextObject.subject.reference = Patient;
//         } else if (nextObject.patient) {
//             nextObject.patient.reference = Patient;
//         }
//         delete nextObject.encounter;
//         for (let k1 in nextObject) {
//             if (nextObject.hasOwnProperty(k1)) {
//                 if (Array.isArray(nextObject[k1])) {
//                     for (let i = 0; i < nextObject[k1].length; i++) {
//                         if (nextObject[k1][i].reference && hashMap[nextObject[k1][i].reference]) {
//                             nextObject[k1][i].reference = hashMap[nextObject[k1][i].reference];
//                         } else if (nextObject[k1][i].individual && nextObject[k1][i].individual.reference) {
//                             nextObject[k1][i].individual.reference = hashMap[nextObject[k1][i].individual.reference];
//                         } else if (nextObject[k1][i].actor && nextObject[k1][i].actor.reference) {
//                             nextObject[k1][i].actor.reference = hashMap[nextObject[k1][i].actor.reference];
//                         }
//                     }
//                 } else {
//                     let reference = nextObject[k1].reference;
//                     if (reference && hashMap[reference]) {
//                         nextObject[k1].reference = hashMap[reference];
//                     }
//                 }
//             }
//         }
//         upload(nextObject, arrayLoad);
//     } else {
//         Patients.push(Patient);
//         Patient = null;
//         hashMap = {};
//     }
// }