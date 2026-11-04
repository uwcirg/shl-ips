<script lang="ts">
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { DiagnosticReport } from 'fhir/r4';
  import { choiceDTFields, hasChoiceDTField } from '$lib/utils/util';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import DateLine from '$lib/components/resource-templates/DateLine.svelte';

  // Shared look for a DiagnosticReport and its results, used by both the grouped display
  // (DiagnosticReportGroup) and the single-resource template (DiagnosticReport).
  // Slots: "actions" (top right of the header) and the default slot for result rows, which
  // should use the `report-result` / `report-result-content` classes. The rows are indented under
  // the report, with a vertical line down their left side marking them as parts of the report.
  // A GroupShowMore can follow the rows.
  export let report: DiagnosticReport;

  $: category = report.category?.[0]?.coding?.[0];
</script>

<div class="report-card border rounded-4 p-3">
  <div class="report-header">
    <div>
      {#if report.code}
        <CodeableConcept codeableConcept={report.code} />
      {/if}
      {#if hasChoiceDTField('effective', report)}
        <DateLine fields={choiceDTFields('effective', report)} />
      {/if}
    </div>
    <div class="report-actions">
      <slot name="actions" />
    </div>
  </div>

  <div class="report-results">
    <slot />
  </div>
</div>

<style>
  .report-card {
    background: var(--bs-body-bg);
  }
  .report-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  /* The line and indent show the results as sub-components of the report */
  .report-results {
    display: flex;
    flex-direction: column;
    margin-left: 0.25rem;
    padding-left: 0.75rem;
    border-left: 2px solid var(--bs-gray-400, #ced4da);
  }
  /* Rows are slotted in by the parent, so they need :global to be styled from here */
  .report-card :global(.report-result) {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    padding: 0.5rem 0.25rem;
  }
  .report-card :global(.report-result + .report-result) {
    border-top: 1px solid var(--bs-border-color-translucent, rgba(0, 0, 0, 0.1));
  }
  .report-card :global(.report-result-content) {
    flex: 1 1 auto;
    min-width: 0;
    overflow-x: auto;
  }
</style>
