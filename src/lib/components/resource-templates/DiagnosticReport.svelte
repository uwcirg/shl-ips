<script lang="ts">
  import type { BundleEntry, DiagnosticReport, Observation } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import ObservationTemplate from '$lib/components/resource-templates/Observation.svelte';
  import DiagnosticReportCard from '$lib/components/resource-templates/DiagnosticReportCard.svelte';
  import { getEntry, hasChoiceDTField } from '$lib/utils/util';

  // Used when a report is shown on its own: results that can't be resolved into a grouped
  // display (contained resources, unresolvable references) and the viewer/selector views.
  // The surrounding list supplies the report's "View" button, so none is rendered here.
  export let content: ResourceTemplateParams<DiagnosticReport>; // Define a prop to pass the data to the component

  const INITIAL_RESULTS = 5;

  let resource: DiagnosticReport;
  $: if (content) resource = content.resource;

  let showAll = false;

  // handle DiagnosticReport.result references
  interface ResolvedResult {
    resource?: Observation;
    display?: string;
  }
  let results: ResolvedResult[] = [];

  $: {
    if (resource?.result) {
      results = resource.result.reduce<ResolvedResult[]>((acc, result) => {
        let resultFields: ResolvedResult = {};

        if (result.reference) {
          // Contained results first, matched by id ("#id" or a trailing Type/id) rather than
          // assuming the first contained resource is the one referenced
          const referenceId = result.reference.startsWith('#')
            ? result.reference.slice(1)
            : result.reference.split('/').pop();
          let resultResource = resource.contained?.find(
            (contained) => contained.resourceType === 'Observation' && contained.id === referenceId
          ) as Observation | undefined;
          if (!resultResource && !result.reference.startsWith('#')) {
            resultResource = getEntry(content.entries as BundleEntry[], result.reference) as Observation;
          }
          if (resultResource) {
            resultFields.resource = resultResource;
          }
        }

        if (result.display) {
          resultFields.display = result.display;
        }

        if (Object.keys(resultFields).length > 0) {
          acc.push(resultFields);
        }

        return acc;
      }, []);
    } else {
      results = [];
    }
  }

  $: visibleResults = showAll ? results : results.slice(0, INITIAL_RESULTS);
  $: hiddenCount = results.length - visibleResults.length;
  // The report's date is shown once in the header, so results don't repeat it
  $: hideResultDates = hasChoiceDTField('effective', resource);
</script>

<DiagnosticReportCard report={resource}>
  {#each visibleResults as result}
    <div class="report-result">
      <div class="report-result-content">
        {#if result.resource}
          <ObservationTemplate
            content={{ resource: result.resource, entries: content.entries }}
            contained={hideResultDates}
          />
        {:else if result.display}
          {result.display}
        {/if}
      </div>
    </div>
  {/each}
  {#if results.length > INITIAL_RESULTS}
    <button type="button" class="report-show-more" on:click={() => (showAll = !showAll)}>
      {showAll ? 'Show fewer' : `Show ${hiddenCount} more result${hiddenCount === 1 ? '' : 's'}`}
    </button>
  {/if}
</DiagnosticReportCard>
