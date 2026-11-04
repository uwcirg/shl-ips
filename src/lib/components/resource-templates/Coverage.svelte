<script lang="ts">
  import type { Coverage } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import DateLine from '$lib/components/resource-templates/DateLine.svelte';
  import StatusBadge from '$lib/components/resource-templates/StatusBadge.svelte';
  import { hasChoiceDTField, choiceDTFields } from '$lib/utils/util';

  export let content: ResourceTemplateParams<Coverage>; // Define a prop to pass the data to the component

  let resource: Coverage;
  $: if (content) resource = content.resource;

</script>

<StatusBadge status={resource.status} br />
{#if resource.type}
  <CodeableConcept codeableConcept={resource.type} />
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
            <CodeableConcept codeableConcept={classItem.type} bold={false} />
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
{#if resource.network}
  Network: {resource.network}<br>
{/if}
{#if hasChoiceDTField("period", resource)}
  <DateLine fields={choiceDTFields("period", resource)} />
{/if}
