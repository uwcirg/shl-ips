<script lang="ts">
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { AllergyIntolerance } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import { hasChoiceDTField, choiceDTFields } from '$lib/utils/util';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import DateLine from '$lib/components/resource-templates/DateLine.svelte';
  import StatusBadge from '$lib/components/resource-templates/StatusBadge.svelte';
  
  export let content: ResourceTemplateParams<AllergyIntolerance>; // Define a prop to pass the data to the component

  let resource: AllergyIntolerance;
  $: if (content) resource = content.resource;

  function badgeColor(criticality: string) {
    if (criticality) {
      if (criticality == 'high') {
        return 'danger';
      } else {
        return 'warning';
      }
    } else {
      return 'secondary';
    }
  }
</script>

<StatusBadge
  status={resource.clinicalStatus?.coding?.[0]?.code}
/>
<StatusBadge
  status={resource.verificationStatus?.coding?.[0]?.code}
/>
{#if resource.criticality}
<Badge color={badgeColor(resource.criticality ?? '')}>
  criticality: {resource.criticality}
</Badge><br>
{/if}
{#if resource.code}
  <CodeableConcept codeableConcept={resource.code} />
{/if}
{#if hasChoiceDTField("onset", resource)}
  <DateLine period fields={choiceDTFields("onset", resource)} />
{/if}
{#if resource.lastOccurrence}
  <DateLine label="Last occurrence" fields={choiceDTFields("lastOccurrence", resource)} />
{/if}
