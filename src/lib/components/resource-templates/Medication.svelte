<script lang="ts">
  import { Button, Icon } from '@sveltestrap/sveltestrap';
  import type { Medication } from "fhir/r4";
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';

  export let content: ResourceTemplateParams<Medication>; // Define a prop to pass the data to the component

  let resource: Medication;
  $: if (content) resource = content.resource;

  let showComposition = false;
</script>

{#if resource.code}
  <CodeableConcept codeableConcept={resource.code} />
{/if}
{#if resource.ingredient}
  <Button
    class="my-1"
    size="sm"
    color={!showComposition ? "secondary" : "primary"}
    outline
    on:click={() => showComposition = !showComposition}>
    {showComposition ? 'Hide' : 'Show'} ingredients <Icon style="font-size: x-small;"name={!showComposition ? "caret-down" : "caret-up"} />
  </Button><br>
  {#if showComposition}
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
          <td><CodeableConcept codeableConcept={ingredient.itemCodeableConcept} /></td>
          <td>{ingredient.strength?.numerator?.value ?? ""}</td>
          <td>{ingredient.strength?.numerator?.unit ?? ""}</td>
          <td>{ingredient.strength?.denominator?.value ?? ""}</td>
          <td>{ingredient.strength?.denominator?.unit ?? ""}</td>
        </tr>
      {/each}
      </tbody>
    </table>
  {/if}
{/if}
