<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { CodeableConcept } from 'fhir/r4';

  export let codeableConcept: CodeableConcept | undefined;
</script>
{#if codeableConcept?.coding}
  {#each codeableConcept.coding as coding, index}
    <Badge color="primary">{coding.system} : {coding.code}</Badge>
    {#if index === 0}
      {#if coding.display}
        <br>
        <strong>{coding.display}</strong>
        <br>
      {:else if codeableConcept.text}
        <br>
        <strong>{codeableConcept.text}</strong>
        <br>
      {/if}
    {:else}
      {#if coding.display}
        <br>
        {coding.display}
        <br>
      {:else if codeableConcept.text}
        <br>
        {codeableConcept.text}
        <br>
      {/if}
    {/if}
  {/each}
{:else if codeableConcept?.text}
  <br>
  <strong>{codeableConcept.text}</strong>
  <br>
{/if}