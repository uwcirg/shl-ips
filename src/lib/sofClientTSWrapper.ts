import {
    authorize as authorizeJS,
    retrieve as retrieveJS
} from './sofClient.js';

export function authorize(inputFhirUrl: string) {
    return authorizeJS(inputFhirUrl);
}

export async function retrieve() {
    let resources = await retrieveJS();
    return resources;
}