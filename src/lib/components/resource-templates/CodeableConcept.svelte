<script lang="ts">
  import { Badge} from '@sveltestrap/sveltestrap';
  import type { CodeableConcept } from "fhir/r4";
  import { onMount } from 'svelte';

  export let codeableConcept: CodeableConcept; // Define a prop to pass the data to the component
  export let badge = true;
  export let bold = true;

  let codeSet: Set<string> = new Set();
  onMount(() => {
    if (codeableConcept?.coding) {
      codeableConcept.coding.forEach(coding => {
        if (coding.display !== undefined) {
          codeSet.add(coding.display);
        }
      });
    }
    if (codeableConcept?.text) {
      codeSet.add(codeableConcept.text);
    }
    codeSet = new Set([...codeSet]);
  })
</script>

{#if codeableConcept?.coding?.length > 0}
  {#if badge}
    <Badge color="primary">{codeableConcept.coding[0].system} : {codeableConcept.coding[0].code}</Badge>
    <br>
  {/if}
  {#if codeSet.size > 0}
    {#each [...codeSet] as code, index}
      {#if index === 0 && bold}
        <strong>{code}</strong><br>
      {:else}
        {code}<br>
      {/if}
    {/each}
  {/if}
{:else if codeableConcept?.text}
  {#if bold}
    <strong>{codeableConcept.text}</strong><br>
  {:else}
    {codeableConcept.text}<br>
  {/if}
{/if}