<script lang="ts">
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { ExplanationOfBenefit } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';
  import { hasChoiceDTField, choiceDTFields } from '$lib/utils/util';

  export let content: ResourceTemplateParams<ExplanationOfBenefit>; // Define a prop to pass the data to the component

  let resource: ExplanationOfBenefit;
  $: if (content) resource = content.resource;

  function statusBadgeColor(status: string) {
    if (status == 'active') {
      return 'primary';
    } else if (status == 'entered-in-error') {
      return 'danger';
    } else {
      return 'secondary';
    }
  }

  function outcomeBadgeColor(outcome: string) {
    if (outcome == 'complete') {
      return 'primary';
    } else if (outcome == 'queued') {
      return 'info';
    } else if (outcome == 'partial') {
      return 'warning';
    } else if (outcome == 'error') {
      return 'danger';
    } else {
      return 'secondary';
    }
  }
  function decisionBadgeColor(decision: string) {
    if (decision == 'approved') {
      return 'success';
    } else if (decision == 'pending') {
      return 'info';
    } else if (decision == 'partial') {
      return 'warning';
    } else if (decision == 'denied') {
      return 'danger';
    } else {
      return 'secondary';
    }
  }
</script>

{#if resource.status}
  <Badge color={statusBadgeColor(resource.status)}>
    {resource.status}
  </Badge>
{/if}
{#if resource.outcome}
  <Badge color={outcomeBadgeColor(resource.outcome)}>
    {resource.outcome}
  </Badge>
{/if}
{#if resource.use}
  <Badge color="primary">
    {resource.use}
  </Badge>
{/if}
<br>
{#if resource.decision?.coding[0]?.code}
  <Badge color={decisionBadgeColor(resource.decision.coding[0].code)}>
    {resource.decision.coding[0].code}
  </Badge>
  <!-- Add disposition dropdown -->
  <br>
{/if}
{#if resource.created}
  <b>Created</b> <Date fields={choiceDTFields("created", resource)} /><br>
{/if}
{#if resource.billablePeriod}
  <b>Billable for</b> <Date fields={choiceDTFields("billablePeriod", resource)} /><br>
{/if}
{#if resource.insurance && resource.insurance?.[0]?.coverage?.display}
  Insurance: {resource.insurance[0].coverage.display}<br>
{/if}
{#if resource.procedure}
  <table class="table table-bordered table-sm">
    <thead>
      <tr><th colspan="3">Procedure(s)</th></tr>
    </thead>
    <thead>
      <tr>
        <th>Date</th>
        <th>Procedure</th>
        <th>Type</th>
      </tr>
    </thead>
    <tbody>
    {#each resource.procedure as procedure}
      <tr>
        <td>
          <Date fields={choiceDTFields("date", procedure)} />
        </td>
        <td>
          <CodeableConcept codeableConcept={procedure.procedureCodeableConcept} badge={true} bold={false} />
        </td>
        <td>
          <CodeableConcept codeableConcept={procedure.type[0]} badge={false} bold={false} />
        </td>
      </tr>
    {/each}
    </tbody>
  </table>
{/if}
{#if resource.item}
  <table class="table table-bordered table-sm">
    <thead>
      <tr>
        <th colspan="5">Services</th>
      </tr>
      <tr>
        <th>Name</th>
        <th>Date</th>
        <th>Location</th>
        <th>Copay</th>
        <th>Insurance</th>
      </tr>
    </thead>
    <tbody>
      {#each resource.item as item}
        {@const copayAmount = item.adjudication?.find((x) => x.category.coding[0].code == 'coinsurance')?.amount}
        {@const copayValuePieces = copayAmount?.value.toString()?.split('.')}
        {@const copayValueTruncated = `${copayValuePieces?.[0]}.${copayValuePieces?.[1]?.slice(0, 2)}`}
        <tr>
          <td><CodeableConcept codeableConcept={item.productOrService} badge={false} bold={false} /></td>
          <td><Date fields={choiceDTFields("serviced", item)} /></td>
          <td><CodeableConcept codeableConcept={item.locationCodeableConcept} badge={false} bold={false} /></td>
          <td>
            {#if copayAmount}
              {!copayAmount || copayAmount.currency == 'USD' ? '$' + copayValueTruncated : copayValueTruncated + ' ' + copayAmount.currency}
            {/if}
          </td>
          <td>
            {#if item.net}
            {!item.net || item.net.currency == 'USD' ? '$' + item.net.value : item.net.value + ' ' + item.net.currency}
            {/if}
          </td>
        </tr>
        <tr></tr>
      {/each}
    </tbody>
  </table>
  
{/if}
{#if hasChoiceDTField("period", resource)}
  <Date fields={choiceDTFields("period", resource)} /><br>
{/if}
{#if resource.class}
  <table class="table table-bordered table-sm">
    <thead>
      <tr>
        <th>Name</th>
        <th>Value</th>
        <th>Type</th>
      </tr>
    </thead>
    <tbody>
      {#each resource.class as classItem}
        <tr>
          <td>{classItem.name}</td>
          <td>{classItem.value}</td>
          <td>
            <CodeableConcept codeableConcept={classItem.type} badge={false} bold={false} />
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
{#if resource.network}
  Network: {resource.network}<br>
{/if}
