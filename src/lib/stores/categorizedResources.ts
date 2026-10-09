/***
// Custom categorization, default sort
createCategorizedStore(input, {
  categorize: (r) => r.resourceType, // flat by type instead of grouped
});

// Custom sort, default categorization
createCategorizedStore(input, {
  sort: (a, b) => a.id.localeCompare(b.id),
});

// Compose from exported primitives with a tweak
createCategorizedStore(input, {
  config: myConfig,
  sort: (a, b) => defaultSort(a, b, myConfig, { order: 'asc' }),
});

// Handle resource rendering (use ResourceDisplay.svelte):
{#if value.renderInfo.mode === 'component'}
  <svelte:component
    this={value.renderInfo.component}
    content={{ resource: value.rh.resource, entries: ... }}
  />
{:else if value.renderInfo.mode === 'text'}
  {@html value.rh.resource.text.div}
{:else}
  {value.rh.tempId}
{/if}
***/

import type { ComponentType } from 'svelte';
import { type Readable, derived } from 'svelte/store';
import type { Resource } from 'fhir/r4';
import type { ResourceHelper } from '$lib/utils/ResourceHelper';
import { RESOURCE_CONFIG as defaultResourceConfig, RESOURCE_TYPE_FALLBACK_KEY } from '$lib/config/resource_config';
import { getFHIRDateAndPrecision } from '$lib/utils/util';
import { ReferenceIndex } from '$lib/utils/referenceIndex';
import { buildDisplayUnits, defaultGroupers, type DisplayUnit, type Grouper } from '$lib/stores/displayUnits';

export type ResourceInput = Array<{ source: string, resources: ResourceHelper[] }>;

export type CategorizeFn = (resource: Resource, resourceConfig: ResourceConfig) => string;
export type SortFn = (a: Resource, b: Resource) => number;
export type ResourceConfig = typeof defaultResourceConfig;

export interface CategorizedStoreOptions {
  config?: ResourceConfig;
  categorize?: CategorizeFn;
  sort?: SortFn;
  groupers?: Grouper[];
}

export type RenderMode = 'component' | 'text' | 'raw';
export type CategoryName = string;
export type ResourceHelperId = string;

export interface ResourceRenderInfo {
  mode: RenderMode;
  component?: ComponentType;  // set if mode === 'component'
}

export interface CategorizedResource {
  source: string;
  rh: ResourceHelper;
  renderInfo: ResourceRenderInfo;  // pre-computed at derivation time
}

export type CategoryMap = Record<CategoryName, Record<ResourceHelperId, CategorizedResource>>;
export type UnitMap = Record<CategoryName, DisplayUnit[]>;

// Returns both the store and a bound getRenderInfo
export function createCategorizedStore(
  input: Readable<ResourceInput>,
  options: CategorizedStoreOptions = {}):
  {
    store: Readable<CategoryMap>,
    referenceIndex: Readable<ReferenceIndex>,
    unitsStore: Readable<UnitMap>,
    getRenderInfo: (resource: Resource) => ResourceRenderInfo
    sortResources: (a: Resource, b: Resource) => number
    sortUnits: (a: DisplayUnit, b: DisplayUnit) => number
  } {
  const config = options.config ?? defaultResourceConfig;
  const categorize = options.categorize ?? defaultCategorize;
  const sort = options.sort ?? ((a, b) => defaultSort(a, b, config));
  const groupers = options.groupers ?? defaultGroupers;

  const store = derived(input, ($input) => {
    // categorization + sorting using injected fns
    // { source: string, rh: ResourceHelper }[]
    const categories: CategoryMap = {};
    $input.forEach(({ source, resources }: { source: string, resources: ResourceHelper[] }) => {
      resources.forEach(rh => {
        let type = categorize(rh.resource, config);
        if (!(type in categories)) {
          categories[type] = {};
        }
        categories[type][rh.tempId] = { source, rh, renderInfo: getResourceRenderInfo(rh.resource, config, categorize) };
      });
    });
    return categories;
  });
  // Built once per input change, shared by groupers and templates instead of per-row lookups
  const referenceIndex = derived(input, ($input) => new ReferenceIndex($input));
  const getRenderInfo = (resource: Resource) => getResourceRenderInfo(resource, config, categorize);
  const sortResources = (a: CategorizedResource, b: CategorizedResource) => sort(a.rh.resource, b.rh.resource);

  // A unit sorts (and is categorized) by its primary resource: the single resource, a group's
  // anchor if it has one, or else the first member of the group once the members are sorted.
  const primaryOf = (unit: DisplayUnit) =>
    unit.kind === 'single' ? unit.item : (unit.anchor ?? unit.members[0]);
  const sortUnits = (a: DisplayUnit, b: DisplayUnit) => sortResources(primaryOf(a), primaryOf(b));

  // Group across all categories, then bucket each unit by its primary resource's category
  const unitsStore = derived([store, referenceIndex], ([$store, $index]) => {
    const items = Object.values($store).flatMap(category => Object.values(category));
    const units = buildDisplayUnits(items, $index, groupers);
    units.forEach(unit => {
      if (unit.kind === 'group') unit.members.sort(sortResources);
    });
    const unitMap: UnitMap = {};
    units.forEach(unit => {
      const category = categorize(primaryOf(unit).rh.resource, config);
      (unitMap[category] ??= []).push(unit);
    });
    Object.values(unitMap).forEach(list => list.sort(sortUnits));
    return unitMap;
  });

  return { store, referenceIndex, unitsStore, getRenderInfo, sortResources, sortUnits };
}

// Exported so callers can compose their own sort/categorize fns from these primitives
// Default: categorize by resourceConfig.category or default to resourceType
export function defaultCategorize(resource: Resource, resourceConfig: ResourceConfig): string {
  let type = resourceConfig[resource.resourceType]?.category;
  if (!type) {
    type = resource.resourceType;
  }
  return type;
}

export function defaultSort(a: Resource, b: Resource, config: ResourceConfig, options?: { order: 'asc' | 'desc' }): number {
  return resourceSort(a, b, config, options?.order ?? 'desc');
}
export { defaultResourceConfig }; // exported as a building block, not an implicit global

export function getResourceRenderInfo(
  resource: Resource,
  config: ResourceConfig,
  categorize: CategorizeFn = defaultCategorize
): ResourceRenderInfo {
  const key = resource.resourceType;  // same lookup the store uses
  const entry = config[key] ?? config[RESOURCE_TYPE_FALLBACK_KEY];
  const renderInfo: ResourceRenderInfo = {
    mode: 'component'
  };
  if (entry?.component) {
    renderInfo.component = entry.component;
  } else if (resource.text?.div) {
    renderInfo.mode = 'text';
  } else {
    renderInfo.mode = 'raw';
  }
  return renderInfo;
}

function lastUpdatedSort(a, b) {
  let aDate = a?.meta?.lastUpdated;
  let bDate = b?.meta?.lastUpdated;
  if (aDate && !bDate) return 1;
  if (bDate && !aDate) return -1;
  if (!aDate && !bDate) return 0;
  return (new Date(aDate).getTime() - new Date(bDate).getTime());
};

function getResourceSortDate(resource: Resource, fieldsOrPrefixes: string[] = []): {date: Date, precision: number} | null {
  // const birthdate = get(resourceCollection.patient)?.birthDate;
  for (const field of fieldsOrPrefixes) {
    // const val = getFHIRDateAndPrecision(resource, field, birthdate);
    const val = getFHIRDateAndPrecision(resource, field);
    if (val) return val;
  }
  return null;
}

function resourceSort(a: Resource, b: Resource, config: ResourceConfig, order: 'asc' | 'desc' = 'desc') {
  let orderFactor = order === 'asc' ? 1 : -1;
  
  let aVal = getResourceSortDate(a, config[a.resourceType]?.sortFields ?? []);
  let bVal = getResourceSortDate(b, config[b.resourceType]?.sortFields ?? []);
  if (aVal && !bVal) return 1 * orderFactor;
  if (bVal && !aVal) return -1 * orderFactor;
  if (!aVal && !bVal) return lastUpdatedSort(a, b) * orderFactor;
  let val = aVal.date.getTime() - bVal.date.getTime();
  if (val === 0) val = bVal.precision - aVal.precision;
  return val * orderFactor;
}