<script lang="ts">
  import { formatDate } from '$lib/utils/util';
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { Goal } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import DateLine from '$lib/components/resource-templates/DateLine.svelte';
  import StatusBadge from '$lib/components/resource-templates/StatusBadge.svelte';

  export let content: ResourceTemplateParams<Goal>;

  let startDate = '??';
  let dueDate = '??';
  let resource: Goal;
  let lifecycleShown = false;
  $: if (content) {
    resource = content.resource;
    // Extract start and due dates
    
    if (resource.startDate) {
      startDate = formatDate(resource.startDate);
    } else if (resource.startCodeableConcept?.text) {
      startDate = resource.startCodeableConcept.text;
    }

    // Get first available due date or duration from targets
    if (resource.target && resource.target.length > 0) {
      const target = resource.target[0];
      if (target.dueDate) {
        dueDate = formatDate(target.dueDate);
      } else if (target.dueDuration) {
        dueDate = `in ${target.dueDuration.value} ${target.dueDuration.unit}`;
      }
    }
  }
</script>

<!-- Display lifecycle status, unless it is the usual active -->
<StatusBadge status={resource.lifecycleStatus} bind:visible={lifecycleShown} />

<!-- Display priority if available -->
{#if resource.priority}
  <Badge color="primary">
    priority: 
    {#if resource.priority.text}
      {resource.priority.text}
    {:else if resource.priority.coding}
      {#each resource.priority.coding as code}
        {#if code.display}
          {code.display.toLowerCase()}
        {:else if code.code}
          {code.code.toLowerCase()}
        {/if}
      {/each}
    {/if}
  </Badge>
{/if}

<!-- Display achievementStatus if available -->
{#if resource.achievementStatus}
  <Badge color="primary">
    {#if resource.achievementStatus.text}
      {resource.achievementStatus.text}
    {:else if resource.achievementStatus.coding}
      {#each resource.achievementStatus.coding as status}
        {#if status.display}
          {status.display.toLowerCase()}
        {:else if status.code}
          {status.code.toLowerCase()}
        {/if}
      {/each}
    {/if}
  </Badge>
{/if}

{#if lifecycleShown || resource.priority || resource.achievementStatus}
  <br>
{/if}

<!-- Display description --> 
{#if resource.description}
  {#if resource.description.text}
    <strong>{resource.description.text}</strong>
  {:else if resource.description.coding}
    {#each resource.description.coding as code}
      {code.system} : {code.code}
      {#if code.display}
        <strong>{code.display}</strong>
      {:else if code.code}
        <strong>{code.code}</strong>
      {/if}
    {/each}
  {/if}
{/if}

<!-- Display timeline -->
{#if startDate !== '??' || dueDate !== '??'}
  <DateLine>{startDate} ➔ {dueDate}</DateLine>
{/if}