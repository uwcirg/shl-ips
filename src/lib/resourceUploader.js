import { INTERMEDIATE_FHIR_SERVER_BASE } from './config';

// This is both allowable and reverse order of loading
const allowableResourceTypes = [
    'AllergyIntolerance',
    // 'CarePlan', Still needs some work for referential integrity
    'Consent',
    'Condition',
    'ClinicalImpression',
    'Device',
    'DeviceUseStatement',
    'DiagnosticReport',
    'DocumentReference',
    'Encounter',
    'Immunization',
    'Location',
    'Media',
    'Medication',
    'MedicationRequest',
    'MedicationStatement',
    'Observation',
    'Organization',
    // 'Patient', // This is loaded separately
    'Practitioner',
    // 'PractitionerRole', Not relevant to IPS
    'Procedure',
    'Specimen'
];

export function getResourcesFromIPS(ips) {
    let entries = ips.entry;
    let resources = [];
    entries.forEach((entry) => {
        if (entry.resource.resourceType == 'Condition') return; // Omit conditions until ips fhir server is upgraded
        if (entry.resource.resourceType == 'Composition') return;

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

// Create Bundle and POST
export async function uploadResources(resources) {
    let entries = [];
    resources.forEach(resource => {
        let entry = {
            request: {
                method: "POST",
                url: resource.resourceType
            },
            resource: resource
        };
        entries.push(entry);
    });
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
            if (!response.ok) {
                throw new Error('Error uploading resources', { cause: response });
            }
            return response.json();
        }).then((body) => {
            let ipsUrl = "";
            body.entry.forEach(entry => {
                if (entry.response.location.startsWith('Patient')) {
                    let createdPatient = entry.response.location.split('/_history')[0];
                    ipsUrl = `${INTERMEDIATE_FHIR_SERVER_BASE}/${createdPatient}/$summary`;
                }
                console.log(entry.response.outcome.issue[0].diagnostics);
            });
            return ipsUrl;
        });
}

export function checkResource(data) {
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
