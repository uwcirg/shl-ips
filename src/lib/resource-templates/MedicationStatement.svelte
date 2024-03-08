<script>
  import { Badge, Card, CardBody } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>
{#if resource.status}
<Badge color={resource.status === "unknown" ? "secondary" : "primary"}>Status: {resource.status}</Badge>
<br>
{/if}
{#if resource.medicationCodeableConcept}
  {#if resource.medicationCodeableConcept.coding}  
    <Badge color="primary">{resource.medicationCodeableConcept.coding[0].system}</Badge>
    <Badge color="secondary">{resource.medicationCodeableConcept?.coding[0].code}</Badge>
    <br>
    <strong>{resource.medicationCodeableConcept.coding[0].display ?? ''}</strong>
  {:else if resource.medicationCodeableConcept.text}
    <strong>{resource.medicationCodeableConcept.text}</strong>
  {/if}
{/if}
{resource.resourceReference?.display ?? ''}
{#if resource.effectivePeriod}
  {resource.effectivePeriod.start}{resource.effectivePeriod.end
    ? ` - ${resource.effectivePeriod.end}`
    : ''}
{:else if resource.effectiveDateTime}
  {resource.effectiveDateTime ? `Date: ${resource.effectiveDateTime.split("T")[0]}` : ''}
{/if}
{#if resource.dosage && resource.dosage[0].route && resource.dosage[0].route.coding && resource.dosage[0].doseAndRate}
  <table class="table table-bordered table-sm">
    <thead>
      <tr><th colspan="5">Dosage</th></tr>
      <tr>
        <th scope="col">Route</th>
        <th scope="col">Qty</th>
        <th scope="col">Unit</th>
        <th scope="col">Freq. Qty</th>
        <th scope="col">Freq. Period</th>
      </tr>
    </thead>
    <tr>
      <td>{resource.dosage[0].route.coding[0].display}</td>
      <td>{resource.dosage[0].doseAndRate[0].doseQuantity.value}</td>
      <td>{resource.dosage[0].doseAndRate[0].doseQuantity.unit}</td>
      {#if resource.dosage[0].timing?.repeat}
        <td>{resource.dosage[0].timing.repeat.count}</td>
        <td>{resource.dosage[0].timing.repeat.periodUnit}</td>
      {/if}
    </tr>
  </table>
{/if}
