<script lang="ts">
  import { Button } from '@sveltestrap/sveltestrap';
  import type { DiagnosticReport } from 'fhir/r4';
  import type { DiagnosticReportData, GroupUnit } from '$lib/stores/displayUnits';
  import type { ResourceHelper } from '$lib/utils/ResourceHelper';
  import { hasChoiceDTField } from '$lib/utils/util';
  import DiagnosticReportCard from '$lib/components/resource-templates/DiagnosticReportCard.svelte';
  import GroupShowMore from '$lib/components/resource-templates/GroupShowMore.svelte';
  import GroupSourceDot from '$lib/components/resource-templates/GroupSourceDot.svelte';
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
      <!-- Without source colours this is blank, which keeps the indent that sets results apart from the report -->
      <GroupSourceDot source={result.source} placeholder class="report-result-marker" />
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
      <span class="report-result-marker"></span>
      <div class="report-result-content">{display}</div>
    </div>
  {/each}
  <GroupShowMore {hiddenCount} noun="more result" bind:expanded={showAll} />
</DiagnosticReportCard>
