<script>
  import { Card, CardBody } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

<Card>
  <CardBody>
    {resource.resourceReference.display ?? ''}{resource.status ? ` (${resource.status})` : ""}
    {#if resource.effectivePeriod}
        {resource.effectivePeriod.start}{resource.effectivePeriod.end ? ` - ${resource.effectivePeriod.end}` : ""}
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
  </CardBody>
</Card>
