import type { Bundle, Resource } from 'fhir/r4';
import { ResourceHelper } from '$lib/utils/ResourceHelper';
import { ReferenceIndex } from '$lib/utils/referenceIndex';
import type { CategorizeFn, ResourceInput, SortFn } from '$lib/stores/categorizedResources';

export const IPS_SOURCE = 'ips';

export interface IpsSectionInput {
  title: string;
  // Composition.section.entry references, resolved against the bundle
  references?: string[];
  // Resources already in hand (e.g. the Patient)
  resources?: Resource[];
}

// What createCategorizedStore needs to lay an IPS bundle out by Composition section:
//
//   const { input, categorize, sort } = createIpsCategorizer(bundle, sections);
//   const { unitsStore } = createCategorizedStore(readable(input), { categorize, sort });
//
// The "category" of a resource is the title of the section that lists it, and the sort order is
// its position in the Composition (sections in the order given, entries in their listed order).
// Resources no section lists get no category: they still take part in grouping and reference
// lookups, but get no row of their own. Grouping then follows from the store: a group is placed
// by its anchor, else its first listed member, and a resource absorbed into a group shows only
// there. A resource listed in several sections is placed in the first.
export function createIpsCategorizer(
  bundle: Bundle,
  sections: IpsSectionInput[]
): { input: ResourceInput, categorize: CategorizeFn, sort: SortFn } {
  const helpers: ResourceHelper[] = [];
  const helperByResource = new Map<Resource, ResourceHelper>();
  for (const entry of bundle.entry ?? []) {
    if (!entry.resource) continue;
    const rh = new ResourceHelper(entry.resource);
    rh.fullUrl = entry.fullUrl;
    helpers.push(rh);
    helperByResource.set(entry.resource, rh);
  }
  const index = new ReferenceIndex([{ source: IPS_SOURCE, resources: helpers }]);

  // Prefer exact fullUrl / Type/id resolution; fall back to loose fullUrl matching for
  // references written in forms the index can't place.
  function resolve(reference: string): ResourceHelper | undefined {
    const indexed = index.resolve(reference, IPS_SOURCE);
    if (indexed) return indexed.rh;
    for (const rh of helpers) {
      if (!rh.fullUrl) continue;
      if (rh.fullUrl.includes(reference)) return rh;
      const withoutType = reference.replace(rh.resource.resourceType, '').replace(/\//g, '');
      if (withoutType && rh.fullUrl.includes(withoutType)) return rh;
    }
    return undefined;
  }

  // Placement is keyed by tempId so content-identical resources (which the store treats as one)
  // are placed together
  const tempIdByResource = new Map(helpers.map(rh => [rh.resource, rh.tempId]));
  const sectionByTempId = new Map<string, string>();
  const orderByTempId = new Map<string, number>();
  let position = 0;
  const place = (rh: ResourceHelper | undefined, title: string) => {
    if (!rh || sectionByTempId.has(rh.tempId)) return;
    sectionByTempId.set(rh.tempId, title);
    orderByTempId.set(rh.tempId, position++);
  };
  for (const section of sections) {
    section.resources?.forEach(resource => place(helperByResource.get(resource), section.title));
    section.references?.forEach(reference => {
      const rh = resolve(reference);
      if (!rh) console.warn(`IPS section "${section.title}": missing reference ${reference}`);
      place(rh, section.title);
    });
  }

  const tempIdOf = (resource: Resource) => tempIdByResource.get(resource);
  const orderOf = (resource: Resource) => {
    const tempId = tempIdOf(resource);
    return tempId === undefined ? Number.MAX_SAFE_INTEGER : (orderByTempId.get(tempId) ?? Number.MAX_SAFE_INTEGER);
  };

  return {
    input: [{ source: IPS_SOURCE, resources: helpers }],
    categorize: (resource) => {
      const tempId = tempIdOf(resource);
      return tempId === undefined ? undefined : sectionByTempId.get(tempId);
    },
    sort: (a, b) => orderOf(a) - orderOf(b)
  };
}
