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
