import { Resource } from 'fhir/r4.js';

export class ResourceHelper {
    tempId: string;
    original_resource: Resource;
    simple_resource: Resource;
    resource: Resource;
    include: boolean = true;
    inject: boolean = false;

    // Constructor
    constructor(resource: Resource) {
        this.original_resource = resource;
        this.simple_resource = this.simplify(resource);
        this.resource = resource;
        this.tempId = this.hash(this.simple_resource);
    }

    hash(value: any) {
        return JSON.stringify(value);
        // return crypto.createHash('sha1').update(value).digest('hex');
    }

    simplify(resource: Resource) {
        let simpleResource = JSON.parse(JSON.stringify(resource));
        delete simpleResource.id;
        delete simpleResource.meta;
        delete simpleResource.text;
        // delete simpleResource.patient;
        // delete simpleResource.subject;
        // delete simpleResource.encounter;
        // delete simpleResource.requester;
        return this.removeEntries(simpleResource, "reference");
    }

    removeEntries(obj: any, key: string) {
        if (typeof obj === "object") {
            for (let k in obj) {
                if (k === key) {
                    delete obj[k];
                } else {
                    obj[k] = this.removeEntries(obj[k], key);
                }
            }
        } else if (obj instanceof Array) {
            for (let i = 0; i < obj.length; i++) {
                obj[i] = this.removeEntries(obj[i], key);
            }
        }
        return obj;
    }
}
