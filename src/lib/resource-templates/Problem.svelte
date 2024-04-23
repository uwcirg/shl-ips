<script>
  import { Badge } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

{#if resource.code}
  {#if resource.code.coding}
    <Badge color="primary">{resource.code.coding[0].system} : {resource.code.coding[0].code}</Badge>
    <br />
    {#if resource.code.coding[0].display}
      <strong>{resource.code.coding[0].display}</strong><br>
    {:else if resource.code.text}
      <strong>{resource.code.text}</strong><br>
    {/if}
  {:else if resource.code.text}
    <strong>{resource.code.text}</strong><br>
  {/if}
{/if}
{resource.onsetDateTime ? `Since ${resource.onsetDateTime.split("T")[0]}` : ''}
