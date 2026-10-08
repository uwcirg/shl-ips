import type { Resource } from 'fhir/r4';
import type { ResourceHelper } from '$lib/utils/ResourceHelper';

export type ReferenceIndexInput = Array<{ source: string, resources: ResourceHelper[] }>;

export interface IndexedResource {
  source: string;
  rh: ResourceHelper;
}

// Pull the "Type/id" tail out of a relative or absolute reference, ignoring any
// "/_history/<version>" suffix. Returns undefined for contained ("#id") and
// urn: references, which can't be resolved against Type/id.
export function parseTypeId(reference: string): [string, string] | undefined {
  if (!reference || reference.startsWith('#') || reference.startsWith('urn:')) return undefined;
  const parts = reference.split('/');
  const historyAt = parts.indexOf('_history');
  if (historyAt !== -1) parts.length = historyAt;
  if (parts.length < 2) return undefined;
  const id = parts[parts.length - 1];
  const resourceType = parts[parts.length - 2];
  if (!id || !resourceType) return undefined;
  return [resourceType, id];
}

// Every Reference.reference string in the resource (not descending into contained resources).
export function collectReferences(resource: Resource): string[] {
  const refs: string[] = [];
  const visit = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach(visit);
      return;
    }
    for (const [key, value] of Object.entries(obj)) {
      if (key === 'contained') continue;
      if (key === 'reference' && typeof value === 'string') {
        refs.push(value);
      } else {
        visit(value);
      }
    }
  };
  visit(resource);
  return refs;
}

// Resolves references between resources, and answers "what points at this resource".
// Lookups are source-scoped: ids are only unique within the source that supplied
// them, and a reference is always written relative to its own source. Resources are
// identified by ResourceHelper.tempId, the same key the categorized store uses.
//
// Note: ResourceHelper does not retain a bundle fullUrl, so urn:uuid references
// (which only get rewritten at upload time) are not resolvable here.
export class ReferenceIndex {
  #byTypeId = new Map<string, IndexedResource>();      // `${source}|${type}/${id}` -> resource
  #byTempId = new Map<string, IndexedResource>();      // tempId -> resource
  #referencedBy = new Map<string, Set<string>>();      // target tempId -> tempIds of referrers
  #references = new Map<string, Set<string>>();        // referrer tempId -> target tempIds

  constructor(input: ReferenceIndexInput = []) {
    for (const { source, resources } of input) {
      for (const rh of resources) {
        const indexed = { source, rh };
        this.#byTempId.set(rh.tempId, indexed);
        if (rh.resource.id) {
          this.#byTypeId.set(this.#key(source, rh.resource.resourceType, rh.resource.id), indexed);
        }
      }
    }
    for (const indexed of this.#byTempId.values()) {
      for (const ref of collectReferences(indexed.rh.resource)) {
        const target = this.resolve(ref, indexed.source);
        if (!target || target.rh.tempId === indexed.rh.tempId) continue;
        this.#link(indexed.rh.tempId, target.rh.tempId);
      }
    }
  }

  get(tempId: string): IndexedResource | undefined {
    return this.#byTempId.get(tempId);
  }

  resolve(reference: string, fromSource: string): IndexedResource | undefined {
    const typeId = parseTypeId(reference);
    if (!typeId) return undefined;
    return this.#byTypeId.get(this.#key(fromSource, ...typeId));
  }

  // Resources that reference the given resource, optionally limited to one type.
  referencedBy(tempId: string, resourceType?: string): IndexedResource[] {
    return this.#lookup(this.#referencedBy.get(tempId), resourceType);
  }

  // Resources the given resource references, optionally limited to one type.
  referencesOf(tempId: string, resourceType?: string): IndexedResource[] {
    return this.#lookup(this.#references.get(tempId), resourceType);
  }

  #lookup(tempIds: Set<string> | undefined, resourceType?: string): IndexedResource[] {
    if (!tempIds) return [];
    const result: IndexedResource[] = [];
    for (const id of tempIds) {
      const indexed = this.#byTempId.get(id);
      if (indexed && (!resourceType || indexed.rh.resource.resourceType === resourceType)) {
        result.push(indexed);
      }
    }
    return result;
  }

  #link(fromTempId: string, toTempId: string) {
    if (!this.#references.has(fromTempId)) this.#references.set(fromTempId, new Set());
    this.#references.get(fromTempId)!.add(toTempId);
    if (!this.#referencedBy.has(toTempId)) this.#referencedBy.set(toTempId, new Set());
    this.#referencedBy.get(toTempId)!.add(fromTempId);
  }

  #key(source: string, resourceType: string, id: string) {
    return `${source}|${resourceType}/${id}`;
  }
}
