<script>
  import { Badge, Card, CardBody } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>
{#if resource.vaccineCode.coding}
<Badge color="primary">{resource.vaccineCode.coding[0].system} : {resource.vaccineCode.coding[0].code}</Badge>
<br />
{/if}
<strong>
  {#if resource.vaccineCode.coding[0].display}
    {resource.vaccineCode.coding[0].display}
  {:else}
    {resource.vaccineCode.text}
  {/if}
</strong>
<br />
Date:
{#if resource.occurrenceDateTime}
  {resource.occurrenceDateTime.split("T")[0]}
{:else if resource.date}
  {resource.date}
{/if}
