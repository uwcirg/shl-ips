<script lang="ts">
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { AllergyIntolerance } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import { hasChoiceDTField, choiceDTFields } from '$lib/utils/util';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';
  
  export let content: ResourceTemplateParams<AllergyIntolerance>; // Define a prop to pass the data to the component

  let resource: AllergyIntolerance = content.resource;

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

{#if resource.clinicalStatus || resource.verificationStatus}
  <Badge color="primary">
    {resource.clinicalStatus?.coding?.[0].code ?? ''}
    {resource.clinicalStatus &&
      resource.verificationStatus
        ? '/'
        : ''}
    {resource.verificationStatus?.coding?.[0].code ?? ''}
  </Badge>
{/if}
<Badge color={badgeColor(resource.criticality ?? '')}>
  {resource.type ? `${resource.type} - ` : ''}
  criticality: {resource.criticality ?? 'unknown'}
</Badge><br>
{#if resource.code}
  <CodeableConcept codeableConcept={resource.code} />
{/if}
{#if hasChoiceDTField("onset", resource)}
  <Date period fields={choiceDTFields("onset", resource)} />
{/if}
{#if resource.lastOccurrence}
  <br>Last occurrence: <Date fields={{dateTime: resource.lastOccurrence}} />
{/if}
