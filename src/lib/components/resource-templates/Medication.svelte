<script lang="ts">
  import type { Medication } from "fhir/r4";
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';

  export let resource: Medication; // Define a prop to pass the data to the component
</script>

<CodeableConcept codeableConcept={resource.code} />
{#if resource.ingredient}
  <div class="ips-section-table">
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
          <td>{ingredient.itemCodeableConcept?.coding?.[0].display}</td>
          <td>{ingredient.strength?.numerator?.value}</td>
          <td>{ingredient.strength?.numerator?.unit}</td>
          <td>{ingredient.strength?.denominator?.value}</td>
          <td>{ingredient.strength?.denominator?.unit}</td>
        </tr>
      {/each}
    </table>
  </div>
{/if}
