<script>
  import { Badge, Card, CardBody } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

<Card>
  <CardBody>
    Type: {resource.resourceType}
    <br />
    Text:
    {#if resource.text && resource.text.div}
      {resource.text.div}
    {:else}
      <i>No text provided in resource</i>
    {/if}
    <br />
    Category:
    {#if resource.category && resource.category[0] && resource.category[0].coding && resource.category[0].coding[0]}
      {resource.category[0].coding[0].display}
    {/if}
    <br />
    Intent:
    {#if resource.provision && resource.provision.code && resource.provision.code[0] && resource.provision.code[0].coding && resource.provision.code[0].coding[0]}
      {resource.provision.code[0].coding[0].display}
    {/if}
    {#if resource.description && resource.description.text}
      {resource.description.text}
    {/if}
  </CardBody>
</Card>
