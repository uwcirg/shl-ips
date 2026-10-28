import { getContext } from 'svelte';
import { readable, type Readable } from 'svelte/store';
import { getFriendlySourceNameBySource } from '$lib/utils/resourceCollectionUtils';

// Colour for a source with none assigned
export const NEUTRAL_SOURCE_COLOR = '#6c757d';

// How group templates (ObservationGroup, DiagnosticReportGroup, ...) show where a member resource
// came from. Call it while the component initialises: it reads the page's `colorMap` context.
//
// Source colours exist only where the page provides them (not, e.g., on the IPS viewer, which has
// a single source). `showSources` is false there, and group templates leave source marks out.
//
// Friendly source names come from a memo that fills in alongside colorMap, so `sourceName` and
// `colorOf` take the current map ($colorMap) as an argument. Passing it ties the result to the map,
// so it recomputes when the map changes instead of keeping a stale name.
export function useGroupSources() {
  const context = getContext<Readable<Map<string, string>> | undefined>('colorMap');
  const colorMap: Readable<Map<string, string>> = context ?? readable(new Map());

  const sourceName = (source?: string, _colorMap?: Map<string, string>) =>
    source ? getFriendlySourceNameBySource(source) : undefined;

  // The source's colour, or undefined when it has none (callers pick their own fallback)
  const colorOf = (source: string | undefined, colors: Map<string, string>) => {
    const name = sourceName(source, colors);
    return (name && colors.get(name)) || undefined;
  };

  return { showSources: context !== undefined, colorMap, sourceName, colorOf };
}
