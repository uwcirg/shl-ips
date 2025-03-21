<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { Condition } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from './CodeableConcept.svelte';
  import Date from './Date.svelte';
  import { hasChoiceDTField, choiceDTFields } from '$lib/utils/util';

  export let content: ResourceTemplateParams<Condition>; // Define a prop to pass the data to the component

  let resource: Condition = content.resource;

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
<Badge color={badgeColor(resource.severity?.text ?? '')}>
  severity: {resource.severity?.text ?? 'unknown'}
</Badge>
{#if resource.category?.[0]}
  {#if resource.category[0].coding}
    <Badge color="primary">
      {resource.category[0].coding[0].system} : {resource.category[0].coding[0].code}
    </Badge><br>
  {/if}
{:else}
  <br>
{/if}
{#if resource.code}
  <CodeableConcept codeableConcept={resource.code} />
{/if}
{#if resource.bodySite?.[0]?.coding?.[0]?.display}
  Site: {resource.bodySite[0]?.coding?.[0]?.display}<br>
{/if}
{#if hasChoiceDTField("onset", resource)}
  Onset: <Date fields={choiceDTFields("onset", resource)} /><br>
{/if}
{#if hasChoiceDTField("abatement", resource)}
  Abatement: <Date fields={choiceDTFields("abatement", resource)} /><br>
{/if}
{#if resource.recordedDate}
  Recorded: <Date fields={{ dateTime: resource.recordedDate }} /><br>
{/if}
