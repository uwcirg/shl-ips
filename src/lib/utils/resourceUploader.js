import { INTERMEDIATE_FHIR_SERVER_BASE } from '$lib/config/config';

// Create Bundle and POST
export async function uploadResources(resources) {
    let entries = [];
    resources.forEach(resource => {
        let entry = {
            request: {
                // method: resource.resourceType === "Patient" ? "PUT" : "POST",
                method: "POST",
                url: `${resource.resourceType}${resource.resourceType === "Patient" ? "/" + resource.id : ""}`
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
    }).then(async (response) => {
        let body = await response.text();
        let parsedBody;
        try {
            parsedBody = JSON.parse(body);
        } catch (error) {
            console.log(error);
            console.log("Response body:", body);
        }
        if (!response.ok) {
            for (const entry in parsedBody.entry) {
                if (parsedBody.entry[entry].response.outcome.issue[0].diagnostics) {
                    console.error(parsedBody.entry[entry].response.outcome.issue[0].diagnostics);
                }
            }
            throw new Error('Error uploading resources', { cause: response });
        }
        return parsedBody;
    });
}

export function getPatientReferenceFromTransactionResponse(transactionResponse) {
    let createdPatientReference = transactionResponse.entry.find(entry => entry.response.location.startsWith('Patient')).response.location.split('/_history')[0];
    return createdPatientReference;
}

export function generateIpsUrlFromPatientReference(patientReference) {
    return `${INTERMEDIATE_FHIR_SERVER_BASE}/${patientReference}/$summary`;
}

export function uploadResourcesAndGetReference(resources) {
    return uploadResources(resources).then(transactionResponse => {
        let patientReference = getPatientReferenceFromTransactionResponse(transactionResponse);
        return generateIpsUrlFromPatientReference(patientReference);
        // return fetch(ipsUrl).then(response => response.json());
    });
}