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

<strong>Questionnaire reference: {resource.questionnaire}</strong>
<strong>Questionnaire resource: <a href='{resource.questionnaire}'>{resource.identifier.value}</a></strong>
<br />
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
