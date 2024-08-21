import { INTERMEDIATE_FHIR_SERVER_BASE } from './config';

export function getResourcesFromIPS(ips) {
    let entries = ips.entry;
    let resources = [];
    entries.forEach((entry) => {
        // if (entry.resource.resourceType == 'Condition') return; // Omit conditions until ips fhir server is upgraded
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