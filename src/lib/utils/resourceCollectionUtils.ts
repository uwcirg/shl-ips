import { CATEGORIES, METHODS } from "$lib/config/tags";

// Get collections that come from provider servers
export function isProviderCollection(collection: {sourceName: string, category: string, method: string, source: string}) {
  return (
    collection.method === METHODS.PROVIDER_HEALTH_RECORD_SOF ||
    collection.method === METHODS.PROVIDER_HEALTH_RECORD_SOF_SEARCH ||
    collection.method === METHODS.PROVIDER_HEALTH_RECORD_TEFCA ||
    collection.method === METHODS.PROVIDER_HEALTH_RECORD_CARINBB ||
    collection.method === METHODS.ADVANCE_DIRECTIVES_SEARCH
  );
}

// Get collections that the patient wrote
export function isPatientCollection(collection: {sourceName: string, category: string, method: string, source: string}) {
  return (
    !isProviderCollection(collection) &&
    collection.category !== CATEGORIES.PROVIDER_HEALTH_RECORD
  );
}

// Get collections that are ambiguous (url, file, etc.)
export function isOtherCollection(collection: {sourceName: string, category: string, method: string, source: string}) {
  return (
    !isProviderCollection(collection) &&
    !isPatientCollection(collection)
  );
}

export function sortCollections(a: {sourceName: string, category: string, method: string, source: string}, b: {sourceName: string, category: string, method: string, source: string}) {
  return a.sourceName.localeCompare(b.sourceName);
}

export function getFriendlySourceNames(collectionInfo: Array<{sourceName: string, category: string, method: string, source: string}>): Array<string> {
  let patientCollections = collectionInfo.filter(isPatientCollection);
  let providerCollections = collectionInfo.filter(isProviderCollection).sort(sortCollections);
  let otherCollections = collectionInfo.filter(isOtherCollection).sort(sortCollections);
  let displayCollectionInfo = new Set([
    ...patientCollections,
    ...providerCollections,
    ...otherCollections
  ].map(c => getFriendlySourceName(c)));
  return Array.from(displayCollectionInfo);
}

const FRIENDLY_SOURCE_NAMES = new Map();
export function getFriendlySourceName(collectionInfo: {sourceName: string, category: string, method: string, source: string}): string {
  if (FRIENDLY_SOURCE_NAMES.has(collectionInfo.sourceName)) {
    return FRIENDLY_SOURCE_NAMES.get(collectionInfo.sourceName);
  }

  let friendly = isPatientCollection(collectionInfo) ? "Patient Authored Data" : collectionInfo.sourceName;
  memoizeFriendlySourceNames(collectionInfo.sourceName, friendly);
  return friendly;
}

export function getFriendlySourceNameBySource(sourceName: string): string {
  if (FRIENDLY_SOURCE_NAMES.has(sourceName)) {
    return FRIENDLY_SOURCE_NAMES.get(sourceName);
  }
  return sourceName;
}

function memoizeFriendlySourceNames(sourceName: string, friendly: string) {
  FRIENDLY_SOURCE_NAMES.set(sourceName, friendly);
}