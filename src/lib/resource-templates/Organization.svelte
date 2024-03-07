<script>
    import {
    Card,
    CardBody
  } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>
<Card>
    <CardBody>
        {resource.name}
        <br>
        {#if resource.address}
        {#each resource.address.line as line}
            {line}<br>
        {/each}
        {resource.address.city}{resource.address.state ? `, ${resource.address.state}` : ""}{resource.address.country ? `, ${resource.address.country}` : ""} {resource.address.postalCode}
        {/if}
    </CardBody>
</Card>