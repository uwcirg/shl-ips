import type { Observation, Resource } from 'fhir/r4';
import { getFHIRDateAndPrecision } from '$lib/utils/util';

const ORDINAL_VALUE_URL = 'http://hl7.org/fhir/StructureDefinition/ordinalValue';

// LOINC PHQ/GAD answer-list ordinals, used as a fallback when a coded answer
// doesn't carry an ordinalValue extension (e.g. GAD-7 "Not at all" ... "Nearly
// every day").
const CODED_ANSWER_ORDINALS: Record<string, number> = {
  'LA6568-5': 0, // Not at all
  'LA6569-3': 1, // Several days
  'LA6570-1': 2, // More than half the days
  'LA6571-9': 3, // Nearly every day
};

function ordinalFromCoding(coding: any): number | undefined {
  if (!coding) return undefined;
  const ext = coding.extension?.find((e: any) => e.url === ORDINAL_VALUE_URL);
  if (typeof ext?.valueDecimal === 'number') return ext.valueDecimal;
  if (coding.code && coding.code in CODED_ANSWER_ORDINALS) return CODED_ANSWER_ORDINALS[coding.code];
  return undefined;
}

// Best-effort numeric value for plotting an Observation on a sparkline.
// Returns undefined when no numeric value can be derived (the caller then skips it).
export function getObservationNumericValue(observation: Observation): number | undefined {
  if (typeof observation.valueQuantity?.value === 'number') return observation.valueQuantity.value;
  if (typeof observation.valueInteger === 'number') return observation.valueInteger;
  if (typeof (observation as any).valueDecimal === 'number') return (observation as any).valueDecimal;

  const cc = observation.valueCodeableConcept;
  if (cc?.coding) {
    for (const coding of cc.coding) {
      const ord = ordinalFromCoding(coding);
      if (ord !== undefined) return ord;
    }
  }
  const ord = ordinalFromCoding((observation as any).valueCoding);
  if (ord !== undefined) return ord;

  return undefined;
}

// The unit a numeric value is expressed in. Differing units must not share a
// series, since the y values wouldn't be comparable.
function getObservationUnit(observation: Observation): string {
  const q = observation.valueQuantity;
  return q?.code ?? q?.unit ?? '';
}

// Key an Observation by its primary code coding and value unit (system|code|unit)
// so that observations measuring the same thing in the same units group together.
export function getObservationCodeKey(observation: Observation): string | undefined {
  const coding = observation.code?.coding?.find(c => c.code);
  if (!coding?.code) return undefined;
  return `${coding.system ?? ''}|${coding.code}|${getObservationUnit(observation)}`;
}

export interface SparklinePoint {
  id: string;      // unique id of the point's resource (ResourceHelper tempId when built from the list layer), used to highlight/select it
  y: number;       // numeric value
  time: number;    // effective date in ms, for ordering
  source?: string; // source the observation came from, for per-point marking across merged sources
}

export interface SeriesItem {
  id: string;
  resource: Resource;
  source?: string;
}

// Build a map from code-key to a date-sorted series of numeric points, across
// all the given items.
export function buildObservationSeries(
  items: SeriesItem[]
): Map<string, SparklinePoint[]> {
  const groups = new Map<string, SparklinePoint[]>();
  for (const { id, resource, source } of items) {
    if (resource.resourceType !== 'Observation') continue;
    const key = getObservationCodeKey(resource);
    if (!key) continue;
    const y = getObservationNumericValue(resource);
    if (y === undefined) continue;
    const date = getFHIRDateAndPrecision(resource, 'effective');
    const time = date ? date.date.getTime() : 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ id, y, time, source });
  }
  for (const series of groups.values()) {
    series.sort((a, b) => a.time - b.time);
  }
  return groups;
}

// Convenience for callers that only have bare resources (keys points by resource.id).
export function buildObservationSeriesMap(
  resources: Resource[]
): Map<string, SparklinePoint[]> {
  return buildObservationSeries(resources.map(resource => ({ id: resource.id, resource })));
}

// The date-sorted series for a single value, or undefined when there aren't
// enough shared-code points to draw a meaningful sparkline.
export function sparklineSeriesFor(
  resource: Observation,
  seriesMap: Map<string, SparklinePoint[]>
): SparklinePoint[] | undefined {
  if (resource.resourceType !== 'Observation') return undefined;
  const key = getObservationCodeKey(resource);
  if (!key) return undefined;
  const series = seriesMap.get(key);
  return series && series.length >= 2 ? series : undefined;
}
