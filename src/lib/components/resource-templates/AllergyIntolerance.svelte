<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { AllergyIntolerance } from 'fhir/r4';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';

  export let resource: AllergyIntolerance; // Define a prop to pass the data to the component

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
</Badge>
<CodeableConcept codeableConcept={resource.code} />
{resource.onsetDateTime ? `Since ${resource.onsetDateTime.split("T")[0]}` : ''}
