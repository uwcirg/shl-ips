<script lang="ts">
  import { Badge} from 'sveltestrap';
  import type { Medication } from "fhir/r4";
  import type { ResourceTemplateParams } from '$lib/utils/types';
    import CodeableConcept from './CodeableConcept.svelte';

  export let content: ResourceTemplateParams<Medication>; // Define a prop to pass the data to the component

  let resource: Medication = content.resource;
  let codingMap = new Map();
</script>

{#if resource.code}
  <CodeableConcept codeableConcept={resource.code} /><br>
{/if}
{#if resource.ingredient}
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
    <tbody>
    {#each resource.ingredient as ingredient}
      <tr style="text-align: center !important">
        <td>{ingredient.itemCodeableConcept?.coding?.[0].display}</td>
        <td>{ingredient.strength?.numerator?.value}</td>
        <td>{ingredient.strength?.numerator?.unit}</td>
        <td>{ingredient.strength?.denominator?.value}</td>
        <td>{ingredient.strength?.denominator?.unit}</td>
      </tr>
    {/each}
    </tbody>
  </table>
{/if}
