import type { CodeableConcept, Observation, ObservationComponent, Resource } from 'fhir/r4';
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
export function getObservationNumericValue(observation: Observation | ObservationComponent): number | undefined {
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

// Find the value[x] field on an Observation (or Observation.component) and
// return a display string appropriate to its FHIR data type.
export function getValueString(obj: any): string | undefined {
  if (!obj) return undefined;
  const valueKey = Object.keys(obj).find(k => k.startsWith('value') && k !== 'value');
  if (!valueKey) return undefined;
  const value = obj[valueKey];
  if (value === undefined || value === null) return undefined;

  switch (valueKey) {
    case 'valueQuantity':
      return `${value.value ?? ''} ${value.unit ?? ''}`.trim();
    case 'valueCodeableConcept':
      return value.coding?.[0]?.display ?? value.text;
    case 'valueRange':
      return `${value.low?.value ?? '?'} ${value.low?.unit ?? ''} - ${value.high?.value ?? '?'} ${value.high?.unit ?? ''}`.trim();
    case 'valueRatio':
      return `${value.numerator?.value ?? ''} ${value.numerator?.unit ?? ''} / ${value.denominator?.value ?? ''} ${value.denominator?.unit ?? ''}`.trim();
    case 'valuePeriod':
      return `${value.start ?? ''} - ${value.end ?? ''}`;
    case 'valueString':
    case 'valueBoolean':
    case 'valueInteger':
    case 'valueDecimal':
    case 'valueTime':
    case 'valueDateTime':
    case 'valueUri':
    case 'valueCode':
      return String(value);
    default:
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
}

// --- Multi-line (panel) series ---------------------------------------------

// One plotted line: a component of a panel, or the single value of a plain observation.
export interface ChartLine {
  key: string;
  label: string;
  unit: string;  // display unit
  points: SparklinePoint[]; // date-sorted ascending
}

// Chart at most this many lines per group; the rest stay readable in the reading rows.
export const MAX_CHART_LINES = 4;

function codingKey(cc?: CodeableConcept): string | undefined {
  const coding = cc?.coding?.find(c => c.code);
  return coding?.code ? `${coding.system ?? ''}|${coding.code}` : undefined;
}

export function getCodeLabel(cc?: CodeableConcept): string {
  return cc?.text ?? cc?.coding?.find(c => c.display)?.display ?? cc?.coding?.[0]?.code ?? '';
}

export function getDisplayUnit(q?: { unit?: string, code?: string }): string {
  return q?.unit ?? q?.code ?? '';
}

interface ComponentValue {
  key: string;
  label: string;
  unit: string;     // display unit
  unitCode: string; // comparison unit
  y: number;
}

// Numeric components of an Observation (e.g. systolic/diastolic of a blood pressure panel).
function getObservationComponentValues(observation: Observation): ComponentValue[] {
  const values: ComponentValue[] = [];
  for (const component of observation.component ?? []) {
    const key = codingKey(component.code);
    const y = getObservationNumericValue(component);
    if (!key || y === undefined) continue;
    values.push({
      key,
      label: getCodeLabel(component.code),
      unit: getDisplayUnit(component.valueQuantity),
      unitCode: component.valueQuantity?.code ?? component.valueQuantity?.unit ?? '',
      y
    });
  }
  return values;
}

export interface ObservationPanel {
  lines: ChartLine[];
  memberIds: Set<string>;
  unitCodes: Set<string>;
}

// Group Observations that have no numeric value of their own but have numeric
// components, by panel code. Each component code becomes one line.
export function buildObservationPanels(items: SeriesItem[]): Map<string, ObservationPanel> {
  const panels = new Map<string, { lines: Map<string, ChartLine>, memberIds: Set<string>, unitCodes: Set<string> }>();
  for (const { id, resource, source } of items) {
    if (resource.resourceType !== 'Observation') continue;
    if (getObservationNumericValue(resource) !== undefined) continue;
    const panelKey = codingKey(resource.code);
    if (!panelKey) continue;
    const componentValues = getObservationComponentValues(resource);
    if (componentValues.length === 0) continue;
    const date = getFHIRDateAndPrecision(resource, 'effective');
    const time = date ? date.date.getTime() : 0;
    if (!panels.has(panelKey)) panels.set(panelKey, { lines: new Map(), memberIds: new Set(), unitCodes: new Set() });
    const panel = panels.get(panelKey)!;
    panel.memberIds.add(id);
    for (const cv of componentValues) {
      panel.unitCodes.add(cv.unitCode);
      if (!panel.lines.has(cv.key)) {
        panel.lines.set(cv.key, { key: cv.key, label: cv.label, unit: cv.unit, points: [] });
      }
      panel.lines.get(cv.key)!.points.push({ id, y: cv.y, time, source });
    }
  }
  const result = new Map<string, ObservationPanel>();
  for (const [key, panel] of panels) {
    let lines = [...panel.lines.values()];
    lines.forEach(line => line.points.sort((a, b) => a.time - b.time));
    if (lines.length > MAX_CHART_LINES) {
      // Keep the best-populated lines, in their original order
      const keep = new Set([...lines].sort((a, b) => b.points.length - a.points.length).slice(0, MAX_CHART_LINES));
      lines = lines.filter(line => keep.has(line));
    }
    result.set(key, { lines, memberIds: panel.memberIds, unitCodes: panel.unitCodes });
  }
  return result;
}

const LOINC = 'http://loinc.org';
const SYSTOLIC = '8480-6';
const DIASTOLIC = '8462-4';

function componentCodes(observation: Observation): string[] {
  return (observation.component ?? []).map(c =>
    c.code?.coding?.find(coding => coding.system === LOINC && coding.code)?.code ?? ''
  );
}

// Text for an Observation's value in a compact row. A panel with no value of its own shows
// its components. Only blood pressure uses the "135 / 82 mmHg" form, since a slash reads as
// a ratio; every other panel labels each component ("HDL: 50 mg/dL; LDL: 110 mg/dL").
export function getObservationDisplayValue(observation: Observation): string | undefined {
  const direct = getValueString(observation);
  if (direct) return direct;
  const components = (observation.component ?? []).filter(c => getValueString(c) !== undefined);
  if (components.length === 0) return undefined;

  const codes = componentCodes(observation);
  const isBloodPressure =
    codes.length === 2 && codes.includes(SYSTOLIC) && codes.includes(DIASTOLIC);
  if (isBloodPressure && components.length === 2) {
    const systolic = components[codes.indexOf(SYSTOLIC)];
    const diastolic = components[codes.indexOf(DIASTOLIC)];
    const unit = getDisplayUnit(systolic.valueQuantity);
    if (
      typeof systolic.valueQuantity?.value === 'number' &&
      typeof diastolic.valueQuantity?.value === 'number' &&
      unit === getDisplayUnit(diastolic.valueQuantity)
    ) {
      return `${systolic.valueQuantity.value} / ${diastolic.valueQuantity.value} ${unit}`.trim();
    }
  }
  return components
    .map(c => {
      const label = getCodeLabel(c.code);
      const value = getValueString(c);
      return label ? `${label}: ${value}` : value;
    })
    .join('; ');
}
