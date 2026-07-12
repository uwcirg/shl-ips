import { INTERMEDIATE_FHIR_SERVER_BASE } from '$lib/config/config';

// Run the SDC $extract operation on a QuestionnaireResponse that hasn't been
// persisted yet, and return the resources (e.g. Observations) it extracts.
export async function extractResourcesFromQuestionnaireResponse(questionnaireResponse, token=undefined) {
    let headers = {
        'Content-Type': 'application/json+fhir',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(`${INTERMEDIATE_FHIR_SERVER_BASE}/QuestionnaireResponse/$extract`, {
        method: 'POST',
        headers,
        // Pass the QR inline since it isn't in the FHIR server yet.
        body: JSON.stringify(questionnaireResponse),
    });

    let body = await response.text();
    let parsedBody;
    try {
        parsedBody = JSON.parse(body);
    } catch (error) {
        console.log(error);
        console.log("$extract response body:", body);
        return [];
    }

    if (!response.ok) {
        console.error("$extract failed for QuestionnaireResponse", questionnaireResponse.id, parsedBody);
        return [];
    }

    // $extract returns a Bundle of the extracted resources.
    let extracted = (parsedBody?.entry ?? [])
        .map(entry => entry.resource)
        .filter(Boolean);

    // Each extracted resource needs an id so it can be referenced via a
    // urn:uuid fullUrl in a transaction bundle.
    extracted.forEach(resource => {
        if (!resource.id) {
            resource.id = crypto.randomUUID();
        }
    });

    return extracted;
}
