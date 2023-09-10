import {
    prepareResources as prepareResourcesJS,
    uploadResources as uploadResourcesJS
} from './resourceUploader.js';

export function prepareResources(resources: Array<any> | undefined) {
    return prepareResourcesJS(resources);
}

export async function uploadResources() {
    return await uploadResourcesJS();
}
