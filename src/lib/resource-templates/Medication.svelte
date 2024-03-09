<script>
  import { Badge} from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

{#if resource.code}
  {resource.code.text ?? ''}<br>
  {#if resource.code.coding}
    {#each resource.code.coding as code}
      <Badge color="primary">{code.system ?? ''}</Badge>
      {code.display ?? ''} <Badge color="secondary">{code.code ?? ''}</Badge>
    {/each}
  {/if}
  <br>
{:else}
  <Badge color="secondary">Uncoded</Badge>
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
