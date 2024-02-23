<script>
    import {
    Card,
    CardBody
  } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

<Card>
  <CardBody>
    <!-- {resource.statement.resourceType}  -->
    <!-- <br /> -->
    {#if resource.code && resource.code.coding && resource.code.coding.length}
      {#each resource.code.coding as code}
        <span class="badge badge-primary">{code.system}</span>
        <br>
        {code.display}
        {#if code.code}
          ({code.code})
        {/if}
        <br>
      {/each}
    {:else}
      <span class="badge badge-secondary">uncoded</span>
      <br>
      {#if resource.code && resource.code.text}
        {resource.code.text}
      {:else}
        {resource.statement.resourceReference.display}
      {/if}
      <br>
    {/if}
    {#if resource.ingredient && resource.ingredient.resourceCodeableConcept}
      {#each resource.ingredient as ingredient}
        <table class="table table-bordered table-sm">
          <thead>
            <tr><th colspan="5">Composition</th></tr>
            <tr>
              <th scope="col">Ingredient</th>
              <th scope="col">Strength Numerator Qty</th>
              <th scope="col">Unit</th>
              <th scope="col">Strength Denominator Qty</th>
              <th scope="col">Strength Denominator Unit</th>
            </tr>
          </thead>
          <tr>
            <td>{ingredient.resourceCodeableConcept.coding[0].display}</td>
            <td>{ingredient.strength.numerator.value}</td>
            <td>{ingredient.strength.numerator.unit}</td>
            <td>{ingredient.strength.denominator.value}</td>
            <td>{ingredient.strength.denominator.unit}</td>
          </tr>
        </table>
      {/each}
    {/if}
    {#if resource.statement.dosage && resource.statement.dosage[0].route && resource.statement.dosage[0].route.coding && resource.statement.dosage[0].doseAndRate}
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
          <td>{resource.statement.dosage[0].route.coding[0].display}</td>
          <td>{resource.statement.dosage[0].doseAndRate[0].doseQuantity.value}</td>
          <td>{resource.statement.dosage[0].doseAndRate[0].doseQuantity.unit}</td>
          {#if resource.statement.dosage[0].timing && resource.statement.dosage[0].timing.repeat}
            <td>{resource.statement.dosage[0].timing.repeat.count}</td>
            <td>{resource.statement.dosage[0].timing.repeat.periodUnit}</td>
          {/if}
        </tr>
      </table>
    {/if}
  </CardBody>
</Card>
