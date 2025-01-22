<script lang="ts">
  import { Badge} from 'sveltestrap';
  import type { Device } from "fhir/r4";
  import type { ResourceTemplateParams } from '$lib/utils/types';

  export let content: ResourceTemplateParams<Device>; // Define a prop to pass the data to the component

  let resource: Device = content.resource;
  let codingMap = new Map();
</script>

{#if resource.type}
  {#if resource.type.coding}
    <Badge color="primary">{resource.type.coding[0].system} : {resource.type.coding[0].code}</Badge>
    <br />
  {/if}
{/if}
{#if resource.type?.text}
  {(codingMap.set(resource.type.text, 1) && undefined) ?? ""}
  <strong>{resource.type.text}</strong><br>
{/if}
{#if resource.type?.coding}
  {#each resource.type.coding as coding, index}
    {#if !resource.type?.text && index == 0}
      <strong>
        {#if coding.display && !codingMap.get(coding.display)}
          {(codingMap.set(coding.display, 1) && undefined) ?? ""}
          {coding.display}<br>
        {/if}
      </strong>
    {:else}
      {#if coding.display && !codingMap.get(coding.display)}
        {(codingMap.set(coding.display, 1) && undefined) ?? ""}
        {coding.display}<br>
      {/if}
    {/if}
  {/each}
{/if}
