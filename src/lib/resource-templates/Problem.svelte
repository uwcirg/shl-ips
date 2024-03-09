<script>
  import { Badge } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

{#if resource.code && resource.code.coding && resource.code.coding[0]}
  <Badge color="primary">{resource.code.coding[0].system} : {resource.code.coding[0].code}</Badge>
  <br>
  {resource.code.coding[0].display}
{:else if resource.code && resource.code.text}
  {resource.code.text}
{/if}
{resource.onsetDateTime ? `Since ${resource.onsetDateTime.split("T")[0]}` : ''}
