/***
A display unit is what a list row renders: either a single resource, or a group
of related resources shown together (e.g. a series of Observations sharing a code).

Every grouper runs over the full set of resources, so a resource can appear in
any number of groups, including several from one grouper (e.g. an Observation in
its own series and also under the DiagnosticReport that references it). A group
needs at least two members, and a resource only gets a standalone row when no
group contains it. Group membership is display-only: include/exclude state
lives on the resource, so every appearance of it stays in sync.

  createCategorizedStore(input, { groupers: [diagnosticReportGrouper, observationSeriesGrouper] });
***/

import type { CategorizedResource } from '$lib/stores/categorizedResources';
import type { ReferenceIndex } from '$lib/utils/referenceIndex';
import type { Observation } from 'fhir/r4';
import {
  buildObservationPanels,
  buildObservationSeries,
  getCodeLabel,
  getDisplayUnit,
  type ChartLine
} from '$lib/utils/observationSparkline';

export interface SingleUnit {
  kind: 'single';
  item: CategorizedResource;
}

export interface GroupUnit<T = unknown> {
  kind: 'group';
  groupType: string;               // which grouper made it; picks the template to render
  key: string;                     // stable per-group key, unique within a groupType
  members: CategorizedResource[];  // sorted by the store's sort, so members[0] is the primary
  data: T;                         // grouper-specific payload for the template
}

export type DisplayUnit = SingleUnit | GroupUnit;

export interface GroupResult<T = unknown> {
  key: string;
  members: CategorizedResource[];
  data: T;
}

export interface Grouper<T = unknown> {
  type: string;
  group(items: CategorizedResource[], index: ReferenceIndex): GroupResult<T>[];
}

export const OBSERVATION_SERIES = 'observationSeries';

export interface ObservationSeriesData {
  lines: ChartLine[]; // one line for a plain value series, one per component for a panel
}

// Observations with a numeric value that share a code and unit with at least one other
// Observation become a series. Panels (e.g. blood pressure) whose numeric values live in
// components group by panel code, with one line per component. Sources are merged; each
// point carries its source.
export const observationSeriesGrouper: Grouper<ObservationSeriesData> = {
  type: OBSERVATION_SERIES,
  group(items) {
    const byTempId = new Map(items.map(item => [item.rh.tempId, item]));
    const seriesItems = items.map(item => ({ id: item.rh.tempId, resource: item.rh.resource, source: item.source }));
    const results: GroupResult<ObservationSeriesData>[] = [];

    for (const [key, series] of buildObservationSeries(seriesItems)) {
      if (series.length < 2) continue;
      const members = series.map(point => byTempId.get(point.id)!);
      const first = members[0].rh.resource as Observation;
      const line: ChartLine = {
        key,
        label: getCodeLabel(first.code),
        unit: getDisplayUnit(first.valueQuantity),
        points: series
      };
      results.push({ key, members, data: { lines: [line] } });
    }

    for (const [key, panel] of buildObservationPanels(seriesItems)) {
      // Components in different units can't share one axis, so leave those as single rows
      if (panel.memberIds.size < 2 || panel.unitCodes.size > 1) continue;
      const members = [...panel.memberIds].map(id => byTempId.get(id)!);
      results.push({ key: `panel:${key}`, members, data: { lines: panel.lines } });
    }
    return results;
  }
};

export const defaultGroupers: Grouper[] = [observationSeriesGrouper];

export function buildDisplayUnits(
  items: CategorizedResource[],
  index: ReferenceIndex,
  groupers: Grouper[] = defaultGroupers
): DisplayUnit[] {
  const units: DisplayUnit[] = [];
  // Resources that appear in at least one group, and so get no standalone row
  const grouped = new Set<string>();
  for (const grouper of groupers) {
    // Every grouper sees every resource, and a resource may appear in any number of
    // groups, including several from the same grouper (e.g. one Medication shown under
    // each MedicationRequest that references it, or an Observation in its own series
    // and under the DiagnosticReport that references it).
    for (const result of grouper.group(items, index)) {
      const seen = new Set<string>();
      const members = result.members.filter(m => !seen.has(m.rh.tempId) && seen.add(m.rh.tempId));
      if (members.length < 2) continue;
      members.forEach(m => grouped.add(m.rh.tempId));
      units.push({ kind: 'group', groupType: grouper.type, key: result.key, members, data: result.data });
    }
  }
  for (const item of items) {
    if (!grouped.has(item.rh.tempId)) units.push({ kind: 'single', item });
  }
  return units;
}
