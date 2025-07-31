<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { Condition } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';
  import { hasChoiceDTField, choiceDTFields } from '$lib/utils/util';

  export let content: ResourceTemplateParams<Condition>; // Define a prop to pass the data to the component

  let resource: Condition;
  $: if (content) resource = content.resource;

  function severityBadgeColor(severity: string) {
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

  function statusBadgeColor(status: string) {
    if (status == 'inactive') {
      return 'secondary';
    } else {
      return 'primary';
    }
  }
</script>

{#if resource.clinicalStatus || resource.verificationStatus}
  <Badge color={statusBadgeColor(resource.clinicalStatus?.coding?.[0].code ?? '')}>
    {resource.clinicalStatus?.coding?.[0].code ?? ''}
    {resource.clinicalStatus &&
      resource.verificationStatus
        ? '/'
        : ''}
    {resource.verificationStatus?.coding?.[0].code ?? ''}
  </Badge>
{/if}
{#if resource.severity?.text}
<Badge color={severityBadgeColor(resource.severity?.text ?? '')}>
  severity: {resource.severity?.text}
</Badge>
{/if}
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
