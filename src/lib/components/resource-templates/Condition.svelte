<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { Condition } from 'fhir/r4';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';

  export let resource : Condition; // Define a prop to pass the data to the component

  function badgeColor(severity: string) {
    if (severity) {
      if (severity == 'Severe') {
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
<Badge color={badgeColor(resource.severity?.text ?? '')}>severity: {resource.severity?.text ?? 'unknown'}</Badge>
<CodeableConcept codeableConcept={resource.category?.[0]} />
<CodeableConcept codeableConcept={resource.code} />
{#if resource.bodySite}
  Site: {resource.bodySite}<br>
{/if}
{#if resource.onsetDateTime}
  Since {resource.onsetDateTime.split("T")[0]}<br>
{/if}
