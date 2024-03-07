<script>
  import { Badge, Card, CardBody } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

<Card>
  <CardBody>
    {#if resource.onsetDateTime}
      <!-- Insert content here if onsetDateTime exists -->
    {/if}
    {#if resource.code && resource.code.coding && resource.code.coding[0]}
      <Badge color="primary">{resource.code.coding[0].system}</Badge>
      <br />
      {resource.code.coding[0].display} ({resource.code.coding[0].code})
    {/if}
    {#if resource.code && resource.code.text}
      [Uncoded text shown]: {resource.code.text}
    {/if}
  </CardBody>
</Card>
