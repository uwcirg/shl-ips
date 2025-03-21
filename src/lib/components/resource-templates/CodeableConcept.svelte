<script lang="ts">
  import { Badge} from 'sveltestrap';
  import type { CodeableConcept } from "fhir/r4";

  export let codeableConcept: CodeableConcept; // Define a prop to pass the data to the component
  export let badge = false;
  export let bold = false;

  let codingMap = new Set();
</script>

{#if codeableConcept}
  {#if codeableConcept.coding}
    {#if badge}
      <Badge color="primary">{codeableConcept.coding[0].system} : {codeableConcept.coding[0].code}</Badge>
      <br>
    {:else}
      <br>
    {/if}
    {#each codeableConcept.coding as coding, index}
        {#if index == 0 && bold}
          <strong>
            {#if coding.display && !codingMap.has(coding.display) && codingMap.add(coding.display)}
              {coding.display}<br>
            {/if}
          </strong>
        {:else}
          {#if coding.display && !codingMap.has(coding.display) && codingMap.add(coding.display)}
            {coding.display}<br>
          {/if}
        {/if}
      {/each}
  {/if}
  {#if codeableConcept.text && !codingMap.has(codeableConcept.text) && codingMap.add(codeableConcept.text)}
    {codeableConcept.text}
  {/if}
{/if}