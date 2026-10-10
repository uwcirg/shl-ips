<script lang="ts">
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { DiagnosticReport } from 'fhir/r4';
  import { choiceDTFields, hasChoiceDTField } from '$lib/utils/util';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';

  // Shared look for a DiagnosticReport and its results, used by both the grouped display
  // (DiagnosticReportGroup) and the single-resource template (DiagnosticReport).
  // Slots: "actions" (top right of the header) and the default slot for result rows, which
  // should use the `report-result` / `report-result-content` / `report-show-more` classes, and
  // lead with a `report-result-marker` (or the source dot) so results indent under the report.
  export let report: DiagnosticReport;

  $: category = report.category?.[0]?.coding?.[0];
</script>

<div class="report-card border rounded-4 p-3">
  <div class="report-header">
    <div>
      {#if category}
        <Badge color="primary" class="mb-1">{category.display ?? category.code}</Badge><br>
      {/if}
      {#if report.code}
        <CodeableConcept codeableConcept={report.code} />
      {/if}
      {#if hasChoiceDTField('effective', report)}
        <span class="report-date">Effective: <Date fields={choiceDTFields('effective', report)} /></span>
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
  .report-date {
    margin-left: 0.5rem;
    font-size: 0.85rem;
    color: var(--bs-secondary-color, #6c757d);
  }
  .report-results {
    display: flex;
    flex-direction: column;
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
  /* Empty marker with the size of the group's source dot, so rows indent the same way without one */
  .report-card :global(.report-result-marker) {
    flex: 0 0 auto;
    width: 0.6rem;
    height: 0.6rem;
    margin-top: 0.35rem;
  }
  .report-card :global(.report-result-content) {
    flex: 1 1 auto;
    min-width: 0;
    overflow-x: auto;
  }
  .report-card :global(.report-show-more) {
    align-self: flex-start;
    margin: 0.25rem 0 0 0.25rem;
    padding: 0;
    border: 0;
    background: none;
    font-size: 0.85rem;
    color: var(--bs-link-color, #0d6efd);
    cursor: pointer;
  }
  .report-card :global(.report-show-more:hover) {
    text-decoration: underline;
  }
</style>
