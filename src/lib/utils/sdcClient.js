import { INTERMEDIATE_FHIR_SERVER_BASE } from '$lib/config/config';

// GAD7 QuestionnaireResponses coming from these sources point at Questionnaire
// canonicals our $extract can't process. Repoint them to the integer-total
// variant (which our server knows how to $extract).
const GAD7_SOURCE_QUESTIONNAIRE_URLS = [
    "https://gw.interop.community/paciosandbox/open/Questionnaire/GAD7Questionnaire",
    "http://example.org/fhir/Questionnaire/GAD7Questionnaire",
];
const GAD7_TARGET_QUESTIONNAIRE_URL = "https://cirg.uw.edu/Questionnaire/GAD7Questionnaire.integer-total";

// Recursively convert the total-score item's decimal answers to integer answers.
function convertTotalScoreAnswersToInteger(items) {
    if (!Array.isArray(items)) return;
    items.forEach(item => {
        if (item.linkId === "total-score" && Array.isArray(item.answer)) {
            item.answer.forEach(answer => {
                if (answer.valueDecimal !== undefined) {
                    // These totals are always integers, so rounding is lossless.
                    answer.valueInteger = Math.round(answer.valueDecimal);
                    delete answer.valueDecimal;
                }
            });
        }
        // total-score may live under nested items.
        convertTotalScoreAnswersToInteger(item.item);
    });
}

// Normalize GAD7 QuestionnaireResponses so they can be run through $extract.
// Mutates and returns the given resources array.
export function normalizeGad7QuestionnaireResponses(resources) {
    if (!Array.isArray(resources)) return resources;
    resources.forEach(resource => {
        if (resource?.resourceType !== "QuestionnaireResponse") return;
        if (!GAD7_SOURCE_QUESTIONNAIRE_URLS.includes(resource.questionnaire)) return;

        // 1. Repoint the questionnaire canonical.
        resource.questionnaire = GAD7_TARGET_QUESTIONNAIRE_URL;
        // 2. Convert the total-score answer from valueDecimal to valueInteger.
        convertTotalScoreAnswersToInteger(resource.item);
    });
    return resources;
}

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
