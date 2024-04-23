<script>
  import { Badge } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>
{#if resource.vaccineCode}
  {#if resource.vaccineCode.coding}
    <Badge color="primary">{resource.vaccineCode.coding[0].system} : {resource.vaccineCode.coding[0].code}</Badge>
    <br />
    {#if resource.vaccineCode.coding[0].display}
      <strong>{resource.vaccineCode.coding[0].display}</strong><br>
    {:else if resource.vaccineCode.text}
      <strong>{resource.vaccineCode.text}</strong><br>
    {/if}
  {:else if resource.vaccineCode.text}
    <strong>{resource.vaccineCode.text}</strong><br>
  {/if}
{/if}

{#if resource.occurrenceDateTime}
  Date: {resource.occurrenceDateTime.split("T")[0]}
{:else if resource.occurrenceString}
  Date: {resource.occurrenceString}
{:else if resource.date}
  Date: {resource.date}
{/if}
