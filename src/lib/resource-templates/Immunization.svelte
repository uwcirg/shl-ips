<script>
  import { Badge } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>
{#if resource.vaccineCode}
  {#if resource.vaccineCode.coding}
    <Badge color="primary">{resource.vaccineCode.coding[0].system} : {resource.vaccineCode.coding[0].code}</Badge>
    <br />
    <strong>
      {#if resource.vaccineCode.coding[0].display}
        {resource.vaccineCode.coding[0].display}
      {:else if resource.vaccineCode.text}
        {resource.vaccineCode.text}
      {/if}
    </strong>
  {:else if resource.vaccineCode.text}
    <strong>{resource.vaccineCode.text}</strong>
  {/if}
  <br />
{/if}
Date:
{#if resource.occurrenceDateTime}
  {resource.occurrenceDateTime.split("T")[0]}
{:else if resource.occurrenceString}
  {resource.occurrenceString}
{:else if resource.date}
  {resource.date}
{/if}
