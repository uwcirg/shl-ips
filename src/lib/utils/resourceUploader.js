import { INTERMEDIATE_FHIR_SERVER_BASE } from '$lib/config/config';

// Create Bundle and POST
export async function uploadResources(resources, token=undefined) {
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

    let headers = {
        'Content-Type': 'application/json+fhir',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    }

    return await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}`, {
        method: 'POST',
        headers,
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
                if (entry.response?.outcome?.issue?.[0]?.diagnostics) {
                    console.error(entry.response.outcome.issue[0].diagnostics);
                }
            }
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

export function uploadResourcesAndGetReference(resources, token=undefined) {
    return uploadResources(resources, token).then(transactionResponse => {
        let patientReference = getPatientReferenceFromTransactionResponse(transactionResponse);
        return generateIpsUrlFromPatientReference(patientReference);
        // return fetch(ipsUrl).then(response => response.json());
    });
}