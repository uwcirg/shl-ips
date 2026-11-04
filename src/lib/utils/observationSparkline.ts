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

// The unit a numeric value is expressed in. Values in different units share a series but not a
// scale: each unit is charted on its own axis (see chartScalesFor).
function getObservationUnit(observation: Observation): string {
  const q = observation.valueQuantity;
  return q?.code ?? q?.unit ?? '';
}

// The distinct system|code pairs an Observation is coded with, in order
function getObservationCodes(observation: Observation): string[] {
  const codes = (observation.code?.coding ?? [])
    .filter(c => c.code)
    .map(c => `${c.system ?? ''}|${c.code}`);
  return [...new Set(codes)];
}

// Key an Observation by its primary code coding (system|code), so that observations measuring the
// same thing group together whatever their unit.
// This is the observation's own key; see buildObservationSeriesIndex for how an Observation
// coded with only a secondary code of a multi-coded series joins that series instead.
export function getObservationCodeKey(observation: Observation): string | undefined {
  return getObservationCodes(observation)[0];
}

export interface SparklinePoint {
  id: string;      // unique id of the point's resource (ResourceHelper tempId when built from the list layer), used to highlight/select it
  y: number;       // numeric value
  time: number;    // effective date in ms, for ordering
  source?: string; // source the observation came from, for per-point marking across merged sources
  unit?: string;      // unit the value is expressed in (comparison form); points sharing it share a scale
  unitLabel?: string; // the unit as displayed
}

export interface SeriesItem {
  id: string;
  resource: Resource;
  source?: string;
}

export interface SeriesIndex {
  // Date-sorted numeric points by series key
  series: Map<string, SparklinePoint[]>;
  // The series key an Observation was placed under, if it has a numeric value and a code
  keyOf(resource: Resource): string | undefined;
}

// Build the date-sorted series of numeric points, across all the given items.
//
// Observations are keyed by their first code. An Observation coded with several codes
// (e.g. height, body height, vital signs) defines a series by its first code; one coded with a
// single code joins such a series when its code is among the series' codes, so "body height"
// alone is charted with the observations that carry body height among others. Units don't split
// a series: points carry their unit, and the chart gives each unit its own scale.
// Only multi-coded observations are matched this way, so a broad code like "vital signs" that
// appears alongside others can't pull in observations that merely share it: single-coded
// observations are only matched on their one code.
export function buildObservationSeriesIndex(items: SeriesItem[]): SeriesIndex {
  interface Candidate {
    id: string;
    resource: Observation;
    source?: string;
    y: number;
    time: number;
    codes: string[];
    unit: string;
    unitLabel: string;
  }
  const candidates: Candidate[] = [];
  for (const { id, resource, source } of items) {
    if (resource.resourceType !== 'Observation') continue;
    const codes = getObservationCodes(resource);
    if (codes.length === 0) continue;
    const y = getObservationNumericValue(resource);
    if (y === undefined) continue;
    const date = getFHIRDateAndPrecision(resource, 'effective');
    candidates.push({ id, resource, source, y, time: date ? date.date.getTime() : 0, codes, unit: getObservationUnit(resource), unitLabel: getDisplayUnit(resource.valueQuantity) });
  }

  // The series defined by multi-coded observations, with every code their members carry
  const multiCoded = new Map<string, { codes: Set<string>, count: number }>();
  for (const { codes } of candidates) {
    if (codes.length < 2) continue;
    const group = multiCoded.get(codes[0]) ?? { codes: new Set(), count: 0 };
    codes.forEach(code => group.codes.add(code));
    group.count++;
    multiCoded.set(codes[0], group);
  }

  function keyFor({ codes }: Candidate): string {
    if (codes.length > 1) return codes[0];
    // Of the multi-coded series this code belongs to, the best-populated one
    let best: { key: string, count: number } | undefined;
    for (const [key, group] of multiCoded) {
      if (!group.codes.has(codes[0])) continue;
      if (!best || group.count > best.count) best = { key, count: group.count };
    }
    return best?.key ?? codes[0];
  }

  const series = new Map<string, SparklinePoint[]>();
  const keyByResource = new Map<Resource, string>();
  const keyById = new Map<string, string>();
  for (const candidate of candidates) {
    const key = keyFor(candidate);
    keyByResource.set(candidate.resource, key);
    if (candidate.id !== undefined) keyById.set(candidate.id, key);
    if (!series.has(key)) series.set(key, []);
    series.get(key)!.push({
      id: candidate.id,
      y: candidate.y,
      time: candidate.time,
      source: candidate.source,
      unit: candidate.unit,
      unitLabel: candidate.unitLabel
    });
  }
  for (const points of series.values()) {
    points.sort((a, b) => a.time - b.time);
  }
  return {
    series,
    keyOf: (resource) => keyByResource.get(resource) ?? (resource.id !== undefined ? keyById.get(resource.id) : undefined)
  };
}

// Just the series, by key
export function buildObservationSeries(items: SeriesItem[]): Map<string, SparklinePoint[]> {
  return buildObservationSeriesIndex(items).series;
}

// Convenience for callers that only have bare resources (keys points by resource.id).
export function buildObservationSeriesMap(resources: Resource[]): SeriesIndex {
  return buildObservationSeriesIndex(resources.map(resource => ({ id: resource.id, resource })));
}

// The date-sorted series for a single value, or undefined when there aren't
// enough shared-code points to draw a meaningful sparkline.
export function sparklineSeriesFor(
  resource: Observation,
  index: SeriesIndex
): SparklinePoint[] | undefined {
  if (resource.resourceType !== 'Observation') return undefined;
  const key = index.keyOf(resource) ?? getObservationCodeKey(resource);
  if (!key) return undefined;
  // Only values in the observation's own unit are comparable with it
  const unit = getObservationUnit(resource);
  const series = index.series.get(key)?.filter(point => (point.unit ?? '') === unit);
  return series && series.length >= 2 ? series : undefined;
}

// A series' points split into scales, one per unit, with the most common units first. A chart has
// room for two axes, and a unit only gets one when more than one observation uses it (a lone value
// in its own unit can't draw a line against its own scale). Points in any other unit stay in the
// list, without a point on the chart.
export const MAX_CHART_SCALES = 2;
export interface ChartScale {
  unit: string;      // comparison form
  unitLabel: string; // as displayed
  points: SparklinePoint[];
}
export function chartScalesFor(points: SparklinePoint[]): ChartScale[] {
  const scales = new Map<string, ChartScale>();
  for (const point of points) {
    const unit = point.unit ?? '';
    if (!scales.has(unit)) scales.set(unit, { unit, unitLabel: point.unitLabel ?? unit, points: [] });
    scales.get(unit)!.points.push(point);
  }
  // Array.prototype.sort is stable, so units with equally many points stay in order of first use
  return [...scales.values()]
    .filter(scale => scale.points.length >= 2)
    .sort((a, b) => b.points.length - a.points.length)
    .slice(0, MAX_CHART_SCALES);
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
  // Which y axis the line is read against: 0 (left, the default) or 1 (right). Lines of one
  // observation code in different units each get their own axis.
  axis?: number;
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
//
// As with series (see buildObservationSeriesIndex), a panel is defined by the first code of its
// multi-coded observations, and a single-coded observation joins the panel whose codes include its
// code. Here it must also share at least one numeric component code with that panel, so a code that
// merely appears in a panel's code set can't pull in an observation of something else.
export function buildObservationPanels(items: SeriesItem[]): Map<string, ObservationPanel> {
  interface Candidate {
    id: string;
    resource: Observation;
    source?: string;
    time: number;
    codes: string[];
    componentValues: ComponentValue[];
  }
  const candidates: Candidate[] = [];
  for (const { id, resource, source } of items) {
    if (resource.resourceType !== 'Observation') continue;
    if (getObservationNumericValue(resource) !== undefined) continue;
    const codes = getObservationCodes(resource);
    if (codes.length === 0) continue;
    const componentValues = getObservationComponentValues(resource);
    if (componentValues.length === 0) continue;
    const date = getFHIRDateAndPrecision(resource, 'effective');
    candidates.push({ id, resource, source, time: date ? date.date.getTime() : 0, codes, componentValues });
  }

  // The panels defined by multi-coded observations, with every code and numeric component code
  // their members carry
  const multiCoded = new Map<string, { codes: Set<string>, componentKeys: Set<string>, count: number }>();
  for (const { codes, componentValues } of candidates) {
    if (codes.length < 2) continue;
    const group = multiCoded.get(codes[0]) ?? { codes: new Set(), componentKeys: new Set(), count: 0 };
    codes.forEach(code => group.codes.add(code));
    componentValues.forEach(cv => group.componentKeys.add(cv.key));
    group.count++;
    multiCoded.set(codes[0], group);
  }

  function panelKeyFor({ codes, componentValues }: Candidate): string {
    if (codes.length > 1) return codes[0];
    // Of the multi-coded panels this code belongs to, and that share a component, the best-populated
    let best: { key: string, count: number } | undefined;
    for (const [key, group] of multiCoded) {
      if (!group.codes.has(codes[0]) || !componentValues.some(cv => group.componentKeys.has(cv.key))) continue;
      if (!best || group.count > best.count) best = { key, count: group.count };
    }
    return best?.key ?? codes[0];
  }

  const panels = new Map<string, { lines: Map<string, ChartLine>, memberIds: Set<string>, unitCodes: Set<string> }>();
  for (const candidate of candidates) {
    const { id, source, time, componentValues } = candidate;
    const panelKey = panelKeyFor(candidate);
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
