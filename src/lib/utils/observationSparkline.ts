import type { Observation } from 'fhir/r4';
import { getFHIRDateAndPrecision } from '$lib/utils/util';
import type { CategorizedResource } from '$lib/stores/categorizedResources';

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

// Key an Observation by its primary code coding (system|code) so that
// observations sharing a code group together.
export function getObservationCodeKey(observation: Observation): string | undefined {
  const coding = observation.code?.coding?.find(c => c.code);
  if (!coding?.code) return undefined;
  return `${coding.system ?? ''}|${coding.code}`;
}

export interface SparklinePoint {
  id: string;   // ResourceHelper tempId, used to highlight the current observation
  y: number;    // numeric value
  time: number; // effective date in ms, for ordering
}

// Build a map from code-key to a date-sorted series of numeric points, across
// all the given (Observation) resources.
export function buildObservationSeriesMap(
  resources: CategorizedResource[]
): Map<string, SparklinePoint[]> {
  const groups = new Map<string, SparklinePoint[]>();
  for (const cr of resources) {
    const resource = cr.rh.resource as Observation;
    if (resource.resourceType !== 'Observation') continue;
    const key = getObservationCodeKey(resource);
    if (!key) continue;
    const y = getObservationNumericValue(resource);
    if (y === undefined) continue;
    const date = getFHIRDateAndPrecision(resource, 'effective');
    const time = date ? date.date.getTime() : 0;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ id: cr.rh.tempId, y, time });
  }
  for (const series of groups.values()) {
    series.sort((a, b) => a.time - b.time);
  }
  return groups;
}

// The date-sorted series for a single value, or undefined when there aren't
// enough shared-code points to draw a meaningful sparkline.
export function sparklineSeriesFor(
  value: CategorizedResource,
  seriesMap: Map<string, SparklinePoint[]>
): SparklinePoint[] | undefined {
  const resource = value.rh.resource as Observation;
  if (resource.resourceType !== 'Observation') return undefined;
  const key = getObservationCodeKey(resource);
  if (!key) return undefined;
  const series = seriesMap.get(key);
  return series && series.length >= 2 ? series : undefined;
}
