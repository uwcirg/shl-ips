import {
    checkResource as checkResourceJS,
    uploadResources as uploadResourcesJS,
    getResourcesFromIPS as getResourcesFromIPSJS
} from './resourceUploader.js';

export function checkResource(resource:any) {
    return checkResourceJS(resource);
}

export async function uploadResources(resources:any[]) {
    return await uploadResourcesJS(resources);
}

export function getResourcesFromIPS(ips: any) {
    return getResourcesFromIPSJS(ips);
}
