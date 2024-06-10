<script>
  import { Badge } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

{#if resource.category && resource.category[0].coding}
  <Badge color="primary">{resource.category[0].coding[0].code}</Badge><br />
{/if}
{#if resource.period?.start}
Effective {resource.period.start}{resource.period.end
    ? ` - ${resource.period.end}`
    : ''}
{:else if resource.effectiveDateTime}
    Date: {resource.effectiveDateTime.split("T")[0]}
{/if}
<br>
{#if resource.status}
  Status: {resource.status}
{/if}
{#if resource.reasonCode}
  {#if resource.reasonCode.coding}
    <Badge color="primary">{resource.reasonCode.coding[0].system} : {resource.reasonCode.coding[0].code}</Badge>
    <br />
    {#if resource.reasonCode.coding[0].display}
      <strong>{resource.reasonCode.coding[0].display}: </strong>
    {:else if resource.reasonCode.text}
      <strong>{resource.reasonCode.text}: </strong>
    {/if}
  {:else if resource.reasonCode.text}
    <strong>{resource.reasonCode.text}: </strong>
  {/if}
{/if}
