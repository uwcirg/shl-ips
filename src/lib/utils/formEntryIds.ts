import type { Resource } from 'fhir/r4';
import { sourceIdentifierValue } from '$lib/utils/importNormalization';
import { copyOf } from '$lib/utils/util';

// Forms that build resources from user input keep an id with each entry, and save the entry's
// resource under that id. The import records a resource's id as its source identifier
// (preserveSourceIdentifiers), so saving again under the same id lets the import match each
// resource to the stored one (matchBySourceIdentifier). Editing or deleting one entry then
// changes only that resource, instead of removing every resource and adding new ones.

// The id for a new entry
export function createEntryId(): string {
  return crypto.randomUUID();
}

// The id for an entry read from a stored resource: the id the resource was first saved with by
// the form that wrote it (its source identifier), or a new one if it has none
export function entryIdFromResource(resource: Resource, source: string): string {
  return sourceIdentifierValue(resource, source) ?? createEntryId();
}

// A copy of a resource template with the entry's id
export function resourceFromTemplate<T extends Resource>(template: T, id: string): T {
  const resource: T = copyOf(template);
  resource.id = id;
  return resource;
}

// A copy of a resource without empty values: empty strings, nulls, and the empty arrays and
// objects left behind. The FHIR server doesn't store them, so leaving them in makes a resource
// look different from the one that was stored.
export function withoutEmptyValues<T>(value: T): T {
  return prune(value) as T;
}

function prune(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(prune).filter(item => item !== undefined);
    return items.length ? items : undefined;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value)
      .map(([key, child]) => [key, prune(child)] as const)
      .filter(([, child]) => child !== undefined);
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value === '' || value === null ? undefined : value;
}

// Today's date, for entries that haven't been saved before
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
