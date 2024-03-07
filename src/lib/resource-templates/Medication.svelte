<script>
    import {
    Card,
    CardBody
  } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

<Card>
  <CardBody>
    {#if resource.code}
      {resource.code.text ?? ""}
      {#if resource.code.coding}
        {#each resource.code.coding as code}
          <span class="badge badge-primary">{code.system ?? ""}</span>
          {code.display ?? ""} <span class="badge badge-secondary">{code.code ?? ""}</span>
          <br>
        {/each}
      {/if}
    {:else}
      <span class="badge badge-secondary">Uncoded</span>
    {/if}
    {#if resource.ingredient && resource.ingredient.resourceCodeableConcept}
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
        {#each resource.ingredient as ingredient}
          <tr>
            <td>{ingredient.resourceCodeableConcept.coding[0].display}</td>
            <td>{ingredient.strength.numerator.value}</td>
            <td>{ingredient.strength.numerator.unit}</td>
            <td>{ingredient.strength.denominator.value}</td>
            <td>{ingredient.strength.denominator.unit}</td>
          </tr>
        {/each}
      </table>
    {/if}
  </CardBody>
</Card>
