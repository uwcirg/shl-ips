import { INTERMEDIATE_FHIR_SERVER_BASE } from '$lib/config/config';
import { extractResourcesFromQuestionnaireResponse } from '$lib/utils/sdcClient';

// Create Bundle and POST
export async function uploadResources(resources, token=undefined) {
    let entries = resources.map(r => {
        let entry = {
            request: {
                // method: r.resourceType === "Patient" ? "PUT" : "POST",
                method: "POST",
                url: `${r.resourceType}`
            },
            resource: r
        };
        return entry;
    });
    let bundle = {
        resourceType: "Bundle",
        type: "transaction",
        entry: entries
    };

    return await postBundle(bundle, token);
}

export async function uploadBundleEntries(entries, token=undefined) {
    entries = entries.map(e => {
        let entry = {
            request: {
                // method: entry.resource.resourceType === "Patient" ? "PUT" : "POST",
                method: "POST",
                url: `${e.resource.resourceType}`
            },
            fullUrl: e.fullUrl,
            resource: e.resource,
        };
        return entry;
    });
    let bundle = {
        resourceType: "Bundle",
        type: "transaction",
        entry: entries
    };
    return await postBundle(bundle, token);
}

async function postBundle(bundle, token=undefined) {
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
    return uploadBundleEntries(resources, token).then(transactionResponse => {
        let patientReference = getPatientReferenceFromTransactionResponse(transactionResponse);
        return generateIpsUrlFromPatientReference(patientReference);
        // return fetch(ipsUrl).then(response => response.json());
    });
}
