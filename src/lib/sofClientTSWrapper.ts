import {
    authorize as authorizeJS,
    retrieve as retrieveJS
} from './sofClient.js';

export function authorize(inputFhirUrl: string, clientId: string) {
    return authorizeJS(inputFhirUrl, clientId);
}

export async function retrieve() {
    let resources = await retrieveJS();
    return resources;
}