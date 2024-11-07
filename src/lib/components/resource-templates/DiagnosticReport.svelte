<script lang="ts">
  import type { DiagnosticReport } from 'fhir/r4';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';

  export let resource: DiagnosticReport; // Define a prop to pass the data to the component
</script>

<CodeableConcept codeableConcept={resource.code} />
{#if resource.effectivePeriod?.start}
  Effective {resource.effectivePeriod.start}{resource.effectivePeriod.end
    ? ` - ${resource.effectivePeriod.end}`
    : ''}
{:else if resource.effectiveDateTime}
    Date: {resource.effectiveDateTime.split("T")[0]}
{/if}
<br>
{#if resource.result}
  <div class="ips-section-table">
    <table class="table table-bordered table-sm">
      <thead>
        <tr><th colspan="5">Result(s)</th></tr>
      </thead>
      {#each resource.result as result}
        {#if result.display}
        <tr>
          <td>{result.display}</td>
        </tr>
        {/if}
      {/each}
    </table>
  </div>
{/if}
