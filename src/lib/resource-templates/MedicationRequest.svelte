<script>
  import { Card, CardBody } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

<Card>
  <CardBody>
    {#if resource.medicationCodeableConcept}
      {#if resource.medicationCodeableConcept.text}
        {resource.medicationCodeableConcept.text}
      {:else}
        <span class="badge badge-primary">{resource.medicationCodeableConcept.system ?? ''}</span>
        {resource.medicationCodeableConcept.display ?? ''}
        <span class="badge badge-secondary">{resource.medicationCodeableConcept.code ?? ''}</span>
      {/if}
    {/if}
    {resource.intent ? `Intent: ${resource.intent}` : ''}
    {resource.status ? `Status: ${resource.status}` : ''}
    {resource.dispenseRequest?.validityPeriod
      ? `Period: ${resource.dispenseRequest.validityPeriod}`
      : ''}
    {#if resource.dosageInstruction && resource.dosageInstruction[0].text}
      Dosage: {resource.dosageInstruction[0].text}
    {:else if resource.dosageInstruction && resource.dosageInstruction[0].doseAndRate}
      <table class="table table-bordered table-sm">
        <thead>
          <tr><th colspan="5">Dosage</th></tr>
          <tr>
            <th scope="col">Qty</th>
            <th scope="col">Unit</th>
            {#if resource.dosageInstruction[0].timing?.repeat}
              <th scope="col">Freq. Qty</th>
              <th scope="col">Freq. Period</th>
            {/if}
          </tr>
        </thead>
        <tr>
          <td>{resource.dosageInstruction[0].doseAndRate[0].doseQuantity.value}</td>
          <td>{resource.dosageInstruction[0].doseAndRate[0].doseQuantity.unit}</td>
          {#if resource.dosageInstruction[0].timing?.repeat}
            <td>{resource.dosageInstruction[0].timing.repeat.count}</td>
            <td>{resource.dosageInstruction[0].timing.repeat.periodUnit}</td>
          {/if}
        </tr>
      </table>
    {/if}
  </CardBody>
</Card>
