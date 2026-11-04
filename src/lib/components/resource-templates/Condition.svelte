<script lang="ts">
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { Condition } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import DateLine from '$lib/components/resource-templates/DateLine.svelte';
  import StatusBadge from '$lib/components/resource-templates/StatusBadge.svelte';
  import { hasChoiceDTField, choiceDTFields } from '$lib/utils/util';

  export let content: ResourceTemplateParams<Condition>; // Define a prop to pass the data to the component

  let resource: Condition;
  let clinicalStatusShown = false;
  let verificationStatusShown = false;
  $: if (content) resource = content.resource;

  function severityBadgeColor(severity: string) {
    if (severity) {
      if (severity === 'severe' || severity === 'critical' || severity === 'high') {
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
  bind:visible={clinicalStatusShown}
/>
<StatusBadge
  status={resource.verificationStatus?.coding?.[0]?.code}
  bind:visible={verificationStatusShown}
/>
{#if resource.severity}
{@const severity = (resource.severity?.coding?.[0].display ?? resource.severity?.text ?? undefined)?.toLowerCase()}
  {#if severity}
    <Badge color={severityBadgeColor(severity)}>
      severity: {severity}
    </Badge>
  {/if}
{/if}
{#if clinicalStatusShown || verificationStatusShown || resource.severity?.text}
  <br>
{/if}
{#if resource.code}
  <CodeableConcept codeableConcept={resource.code} />
{/if}
{#if resource.bodySite?.[0]?.coding?.[0]?.display}
  Site: {resource.bodySite[0]?.coding?.[0]?.display}<br>
{/if}
{#if hasChoiceDTField("onset", resource)}
  <DateLine label="Onset" fields={choiceDTFields("onset", resource)} />
{/if}
{#if hasChoiceDTField("abatement", resource)}
  <DateLine label="Abatement" fields={choiceDTFields("abatement", resource)} />
{/if}
{#if resource.recordedDate}
  <DateLine label="Recorded" fields={choiceDTFields("recordedDate", resource)} />
{/if}
