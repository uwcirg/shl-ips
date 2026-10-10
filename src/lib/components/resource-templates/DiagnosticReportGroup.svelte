<script lang="ts">
  import { getContext } from 'svelte';
  import { readable, type Readable } from 'svelte/store';
  import { Button } from '@sveltestrap/sveltestrap';
  import type { DiagnosticReport } from 'fhir/r4';
  import type { DiagnosticReportData, GroupUnit } from '$lib/stores/displayUnits';
  import type { ResourceHelper } from '$lib/utils/ResourceHelper';
  import { hasChoiceDTField } from '$lib/utils/util';
  import { getFriendlySourceNameBySource } from '$lib/utils/resourceCollectionUtils';
  import DiagnosticReportCard from '$lib/components/resource-templates/DiagnosticReportCard.svelte';
  import ObservationTemplate from '$lib/components/resource-templates/Observation.svelte';
  import ResourceDisplay from '$lib/components/app/ResourceDisplay.svelte';

  export let unit: GroupUnit<DiagnosticReportData>;
  // Part of the group template contract; this template resolves everything from the unit itself
  // svelte-ignore unused-export-let
  export let entries: unknown[] = [];
  // Called with a resource's helper when a "View" button is pressed (advanced mode only)
  export let onView: ((rh: ResourceHelper) => void) | undefined = undefined;
  export let advanced = false;

  const INITIAL_RESULTS = 5;

  // Source colours exist only where the page provides them (not, e.g., on the IPS viewer, which
  // has a single source); without them the source dot is left out.
  const colorMapContext = getContext<Readable<Map<string, string>> | undefined>('colorMap');
  const colorMap: Readable<Map<string, string>> = colorMapContext ?? readable(new Map());
  const showSources = colorMapContext !== undefined;

  // Friendly names come from a memo that fills in alongside colorMap, so lookups are tied to
  // $colorMap and recompute when it changes.
  const sourceName = (source?: string, _colorMap?: Map<string, string>) =>
    source ? getFriendlySourceNameBySource(source) : undefined;
  const colorOf = (source: string | undefined, colors: Map<string, string>) => {
    const name = sourceName(source, colors);
    return (name && colors.get(name)) || '#6c757d';
  };
  // Svelte 4 doesn't allow TS syntax in markup, so casts live here
  const asReport = (rh: ResourceHelper) => rh.resource as DiagnosticReport;

  let showAll = false;

  $: report = asReport(unit.data.report.rh);
  $: results = unit.data.results;
  $: visibleResults = showAll ? results : results.slice(0, INITIAL_RESULTS);
  $: hiddenCount = results.length - visibleResults.length;
  // Only the report's own results are offered for hasMember resolution, which keeps each
  // result from searching (and graphing against) the whole collection
  $: resultEntries = results.map(result => ({ resource: result.rh.resource }));
  // The report's date is shown once in the header, so results don't repeat it
  $: hideResultDates = hasChoiceDTField('effective', report);
</script>

<DiagnosticReportCard {report}>
  <svelte:fragment slot="actions">
    {#if advanced && onView}
      <Button size="sm" color="secondary" outline on:click={() => onView?.(unit.data.report.rh)}>View</Button>
    {/if}
  </svelte:fragment>

  {#each visibleResults as result (result.rh.tempId)}
    <div class="report-result">
      {#if showSources}
        <span
          class="source-dot"
          style:background={colorOf(result.source, $colorMap)}
          title={`From ${sourceName(result.source, $colorMap) ?? ''}`}
        ></span>
      {/if}
      <div class="report-result-content">
        {#if result.rh.resource.resourceType === 'Observation'}
          <ObservationTemplate
            content={{ resource: result.rh.resource, entries: resultEntries }}
            contained={hideResultDates}
          />
        {:else}
          <ResourceDisplay resource={result.rh.resource} renderInfo={result.renderInfo} entries={resultEntries} />
        {/if}
      </div>
      {#if advanced && onView}
        <Button size="sm" color="secondary" outline on:click={() => onView?.(result.rh)}>View</Button>
      {/if}
    </div>
  {/each}
  {#each unit.data.unresolved as display}
    <div class="report-result text-muted">
      {#if showSources}
        <span class="source-dot placeholder"></span>
      {/if}
      <div class="report-result-content">{display}</div>
    </div>
  {/each}
  {#if results.length > INITIAL_RESULTS}
    <button type="button" class="report-show-more" on:click={() => (showAll = !showAll)}>
      {showAll ? 'Show fewer' : `Show ${hiddenCount} more result${hiddenCount === 1 ? '' : 's'}`}
    </button>
  {/if}
</DiagnosticReportCard>

<style>
  .source-dot {
    flex: 0 0 auto;
    width: 0.6rem;
    height: 0.6rem;
    margin-top: 0.35rem;
    border-radius: 50%;
  }
  .source-dot.placeholder {
    background: transparent;
  }
</style>
