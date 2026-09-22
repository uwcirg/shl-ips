import { INTERMEDIATE_FHIR_SERVER_BASE } from '$lib/config/config';
import { extractResourcesFromQuestionnaireResponse } from '$lib/utils/sdcClient';

/**
 * Create a transaction Bundle from the given resources and POST it.
 * @param {import('fhir/r4').Resource[]} resources
 * @param {string} [token]
 * @returns {Promise<any>} the parsed transaction-response Bundle
 */
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

/**
 * @param {{ resource: import('fhir/r4').Resource, fullUrl?: string }[]} entries
 * @param {string} [token]
 * @returns {Promise<any>} the parsed transaction-response Bundle
 */
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

/**
 * @param {any} bundle
 * @param {string} [token]
 * @returns {Promise<any>} the parsed transaction-response Bundle
 */
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
        if (!response.ok && parsedBody?.entry) {
            for (const entry of parsedBody.entry) {
                if (entry.response?.outcome?.issue?.[0]?.diagnostics) {
                    console.error(entry.response.outcome.issue[0].diagnostics);
                }
            }
        }
        return parsedBody;
    });
}

/**
 * @param {any} transactionResponse
 * @returns {string} the created Patient's reference, e.g. "Patient/123"
 */
export function getPatientReferenceFromTransactionResponse(transactionResponse) {
    const patientEntry = transactionResponse.entry.find(entry => entry.response?.location?.startsWith('Patient'));
    if (!patientEntry) {
        throw new Error('No created Patient found in transaction response');
    }
    return patientEntry.response.location.split('/_history')[0];
}

/**
 * @param {string} patientReference
 * @returns {string}
 */
export function generateIpsUrlFromPatientReference(patientReference) {
    return `${INTERMEDIATE_FHIR_SERVER_BASE}/${patientReference}/$summary`;
}

/**
 * @param {{ resource: import('fhir/r4').Resource, fullUrl?: string }[]} resources
 * @param {string} [token]
 * @returns {Promise<string>} the IPS $summary URL for the newly created Patient
 */
export function uploadResourcesAndGetReference(resources, token=undefined) {
    return uploadBundleEntries(resources, token).then(transactionResponse => {
        let patientReference = getPatientReferenceFromTransactionResponse(transactionResponse);
        return generateIpsUrlFromPatientReference(patientReference);
        // return fetch(ipsUrl).then(response => response.json());
    });
}
