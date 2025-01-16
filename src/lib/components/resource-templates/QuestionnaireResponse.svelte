<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { QuestionnaireResponse } from 'fhir/r4';

  export let resource: QuestionnaireResponse; // Define a prop to pass the data to the component

// FIXME won't need this... and likely the rest of this file will need heavy edits...
  function badgeColor(criticality: string) {
    if (criticality) {
      if (criticality == 'high') {
        return 'danger';
      } else {
        return 'primary';
      }
    } else {
      return 'secondary';
    }
  }
</script>

<Badge color="primary">{resource.identifier.value}</Badge><br/>
Questionnaire reference: <a href='{resource.questionnaire}' target='_blank'>{resource.questionnaire}</a><br />
Authored: {resource.authored}
{#if resource.source}
  {#if resource.source.display}
    <br />
    Source: {resource.source.display}
  {:else}
    <br />
    Source: (unknown)
  {/if}
{/if}

<table class="table table-bordered table-sm">
    <thead>
        <tr><th colspan="3">Responses</th></tr>
    </thead>
    <tbody>
        {#each resource.item as item}
            <tr>
                <td>{item.text ?? "No text provided"}</td>
                <td>
                    <!-- Render answers if present -->
                    {#if item.answer}
                        {#each item.answer as ans}
                            {ans.valueString ?? ans.valueCoding?.display ?? "No answer text"}<br/>
                        {/each}
                    {/if}
                </td>
                <td>
                    <!-- Nested subitems -->
                    {#if item.item}
                        <table class="table table-bordered table-sm">
                            <tbody>
                                {#each item.item as subitem}
                                    <tr>
                                        <td>{subitem.text ?? "No subitem text provided"}</td>
                                        <td>
                                            {#if subitem.answer}
                                                {#each subitem.answer as subAns}
                                                    {subAns.valueString ?? subAns.valueCoding?.display ?? "No sub-answer text"}<br/>
                                                {/each}
                                            {/if}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    {/if}
                </td>
            </tr>
        {/each}
    </tbody>
</table>
