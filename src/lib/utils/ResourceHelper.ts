import type { Resource } from 'fhir/r4';

export interface SerializedResourceHelper {
    resource: Resource;
    include: boolean;
    inject: boolean;
}

export class ResourceHelper {
    tempId: string;
    original_resource: Resource;
    simple_resource: Resource;
    resource: Resource;
    include: boolean;
    inject: boolean;

    constructor(resource: Resource, inject?: boolean, include?: boolean) {
        this.original_resource = resource;
        this.include = include ?? true;
        this.inject = inject ?? false;
        this.simple_resource = this.simplify(resource);
        this.resource = JSON.parse(JSON.stringify(resource)) as Resource;
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

    toJSON() {
        const jsonOutput: SerializedResourceHelper = {
            resource: this.original_resource,
            include: this.include,
            inject: this.inject
        }
        return JSON.stringify(jsonOutput);
    }

    static fromJSON(json: string) {
        const data: SerializedResourceHelper = JSON.parse(json);
        return new ResourceHelper(data.resource, data.inject, data.include);
    }
}
