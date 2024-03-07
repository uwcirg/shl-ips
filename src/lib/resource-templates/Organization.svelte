<script>
  import { Card, CardBody } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

<Card>
  <CardBody>
    {resource.name}
    <br />
    {#if resource.address}
      {#if resource.address.line}
        {#if resource.address.line.length > 0}
          {#each resource.address.line as line}
            {line}<br />
          {/each}
        {:else}
          {resource.address.line}
        {/if}
      {/if}
      {resource.address.city}{resource.address.state ? `, ${resource.address.state}` : ''}{resource
        .address.country
        ? `, ${resource.address.country}`
        : ''}
      {resource.address.postalCode}
    {/if}
  </CardBody>
</Card>
