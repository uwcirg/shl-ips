import {
    prepareResources as prepareResourcesJS,
    uploadResources as uploadResourcesJS,
    getIPSResources as getIPSResourcesJS
} from './resourceUploader.js';

export function prepareResources(resources: Array<any> | undefined, append=true) {
    return prepareResourcesJS(resources, append);
}

export async function uploadResources() {
    return await uploadResourcesJS();
}

export function getIPSResources(ips) {
    return getIPSResourcesJS(ips);
}
