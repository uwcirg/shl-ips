<script lang="ts">
  import { Badge, Col, Row} from '@sveltestrap/sveltestrap';
  import type { CodeableConcept } from "fhir/r4";
  import { getContext } from 'svelte';
  import { readable } from 'svelte/store';
  import { DISPLAY_OPTIONS, type DisplayOptions } from '$lib/components/resource-templates/displayOptions';

  export let codeableConcept: CodeableConcept; // Define a prop to pass the data to the component
  export let badge: boolean | undefined = undefined; // overrides the surrounding ResourceDisplay setting when set
  export let bold = true;

  const ctxBadges = getContext<DisplayOptions | undefined>(DISPLAY_OPTIONS)?.showCodeBadges ?? readable(false);
  $: showBadge = badge ?? $ctxBadges;

  let codeSet: Set<string>;
  $: if (codeableConcept) {
    codeSet = new Set();
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
    if (codeSet.size === 0) {
      codeSet.add("Unknown");
    }
    codeSet = new Set([...codeSet]);
  }
</script>

{#if codeableConcept?.coding?.length > 0}
  <Row class="flex-wrap-reverse justify-content-start">
    {#if codeSet.size > 0}
      <Col class="col-auto">
      {#each [...codeSet] as code, index}
        {#if index === 0 && bold}
          <strong>{code}</strong><br>
        {:else}
          {code}<br>
        {/if}
      {/each}
      </Col>
    {/if}
    <Col class="col-auto">
      {#if showBadge}
        <Badge color="primary">{codeableConcept.coding[0].system} : {codeableConcept.coding[0].code ?? "unknown"}</Badge>
        <br>
      {/if}
    </Col>
  </Row>
{:else if codeableConcept?.text}
  {#if bold}
    <strong>{codeableConcept.text}</strong><br>
  {:else}
    {codeableConcept.text}<br>
  {/if}
{/if}