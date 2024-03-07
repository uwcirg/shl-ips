<script>
  import { Badge, Card, CardBody } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

<Card>
  <CardBody>
    {#if resource.medicationCodeableConcept}
      {#if resource.medicationCodeableConcept.text}
        {resource.medicationCodeableConcept.text}
      {:else if resource.medicationCodeableConcept.system && resource.medicationCodeableConcept.code
        || resource.medicationCodeableConcept.display}
        <Badge color="primary">{resource.medicationCodeableConcept.system ?? ''}</Badge> {resource.medicationCodeableConcept.code ?? ''}
        {resource.medicationCodeableConcept.display ?? ''}
        <br>
      {/if}
    {/if}
    <Badge color="primary">{resource.status ? `${resource.status}` : ''}</Badge>
    <Badge color="secondary">{resource.intent ? resource.intent : ''}</Badge>
    <br>
    {#if resource.dispenseRequest?.validityPeriod}
        Valid {resource.dispenseRequest?.validityPeriod.start}{resource.dispenseRequest?.validityPeriod.end
        ? ` - ${resource.dispenseRequest?.validityPeriod.end}`
        : ''}
    {/if}
    <br>
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
