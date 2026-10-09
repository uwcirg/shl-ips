import type { Resource } from 'fhir/r4';
import { PATIENT_REFERENCE_FIELDS } from '$lib/utils/util';

export interface SerializedResourceHelper {
    resource: Resource;
    include: boolean;
    inject: boolean;
}

// Elements that identify or describe a resource's place in a particular system rather than its content.
// Patient-linked fields are replaced with a bare reference to the dataset's Patient on upload (losing
// e.g. a display name), so what they held before then isn't content.
const TOP_LEVEL_SYSTEM_ELEMENTS = new Set(['id', 'meta', 'text', ...PATIENT_REFERENCE_FIELDS]);
// Points at a Composition section narrative, and the Composition isn't imported
const NARRATIVE_LINK_URL = 'http://hl7.org/fhir/StructureDefinition/narrativeLink';
const NESTED_SYSTEM_ELEMENTS = new Set(['id', 'reference', 'identifier']);

const isEmptyElement = (value: any) =>
    value !== null && typeof value === 'object' && Object.keys(value).length === 0;

function stripSystemSpecificElements(value: any, topLevel: boolean = false): any {
    if (Array.isArray(value)) {
        return value.map(item => stripSystemSpecificElements(item)).filter(item => !isEmptyElement(item));
    }
    if (value === null || typeof value !== 'object') {
        return value;
    }
    const result: Record<string, any> = {};
    for (const [key, child] of Object.entries(value)) {
        if (NESTED_SYSTEM_ELEMENTS.has(key) || (topLevel && TOP_LEVEL_SYSTEM_ELEMENTS.has(key))) {
            continue;
        }
        const stripped = stripSystemSpecificElements(
            key === 'extension' && Array.isArray(child) ? child.filter(ext => ext?.url !== NARRATIVE_LINK_URL) : child
        );
        // Elements left empty by the stripping (e.g. a Reference with only a reference) carry nothing
        if (!isEmptyElement(stripped)) {
            result[key] = stripped;
        }
    }
    return result;
}

function canonicalize(value: any): any {
    if (Array.isArray(value)) {
        return value.map(canonicalize);
    }
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
    }
    return value;
}

export class ResourceHelper {
    id: string;
    tempId: string;
    original_resource: Resource;
    simple_resource: Resource;
    resource: Resource;
    include: boolean;
    inject: boolean;

    constructor(resource: Resource, inject?: boolean, include?: boolean) {
        this.id = crypto.randomUUID();
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

    /**
     * The "core" content of a resource, for deciding whether two copies of it differ. Unlike
     * simplify (which defines a resource's identity within a collection, and keeps identifiers),
     * this also drops identifiers (top-level and on references), nested element ids, empty
     * elements left behind, and the order of object keys.
     */
    static core(resource: Resource): any {
        return canonicalize(stripSystemSpecificElements(resource, true));
    }

    static hasSameCore(a: Resource, b: Resource): boolean {
        return JSON.stringify(ResourceHelper.core(a)) === JSON.stringify(ResourceHelper.core(b));
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
