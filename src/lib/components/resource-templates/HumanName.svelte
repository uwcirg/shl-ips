<script lang="ts">
  import type { HumanName } from "fhir/r4";

  export let name: HumanName[] | HumanName | undefined;

  let viewName: HumanName[] | undefined;
  $: {
    if (name) {
      viewName = (Array.isArray(name) ? name : [name]) as HumanName[];
    }
  }

</script>

{#if viewName}
    <strong>
        {#if viewName[0]}
            {#if viewName[0].prefix
                || viewName[0].given
                || viewName[0].family}
                {viewName[0].prefix ?? ""}
                {viewName[0].given ? viewName[0].given.join(' ') : ""}
                {viewName[0].family ?? ""}
            {:else if viewName[0].text}
                {viewName[0].text}
            {/if}
        <!-- TODO: This doesn't pass type checking, but may be necessary for some example data
        {:else}
            {viewName.prefix ?? ""}
            {viewName.given ? viewName.given.join(' ') : ""}
            {viewName.family ?? ""}
        -->
        {/if}
    </strong>
    <br>
{/if}