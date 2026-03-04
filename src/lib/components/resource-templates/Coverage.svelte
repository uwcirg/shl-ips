<script lang="ts">
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { Coverage } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';
  import { hasChoiceDTField, choiceDTFields } from '$lib/utils/util';

  export let content: ResourceTemplateParams<Coverage>; // Define a prop to pass the data to the component

  let resource: Coverage;
  $: if (content) resource = content.resource;

  function statusBadgeColor(status: string) {
    if (status == 'cancelled' || status == 'draft') {
      return 'secondary';
    } else if (status == 'entered-in-error') {
      return 'danger';
    } else {
      return 'primary';
    }
  }
</script>

{#if resource.status}
  <Badge color={statusBadgeColor(resource.status ?? '')}>
    {resource.status ?? ''}
  </Badge>
  <br>
{/if}
{#if resource.type}
  <CodeableConcept codeableConcept={resource.type} badge={false} />
{/if}
{#if hasChoiceDTField("period", resource)}
  <Date fields={choiceDTFields("period", resource)} /><br>
{/if}
{#if resource.class}
  <table class="table table-bordered table-sm">
    <thead>
      <tr>
        <th>Name</th>
        <th>Value</th>
        <th>Type</th>
      </tr>
    </thead>
    <tbody>
      {#each resource.class as classItem}
        <tr>
          <td>{classItem.name}</td>
          <td>{classItem.value}</td>
          <td>
            <CodeableConcept codeableConcept={classItem.type} badge={false} bold={false} />
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
{#if resource.network}
  Network: {resource.network}<br>
{/if}
