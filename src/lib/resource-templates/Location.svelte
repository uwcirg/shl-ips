<script>
    import { Badge, Card, CardBody } from 'sveltestrap';
    export let resource; // Define a prop to pass the data to the component
</script>
  
<strong>{resource.name ?? ""}</strong>
<br />
{#if resource.telecom}
  <table class="table table-bordered table-sm">
      <thead>
          <tr><th colspan="3">Contact Information</th></tr>
      </thead>
        <tr>
            <td>{resource.telecom.system ?? ""}</td>
            <td>{resource.telecom.use ?? ""}</td>
            <td>{resource.telecom.value ?? ""}</td>
        </tr>
  </table>
{/if}
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
    {resource.address.city ?? ""
    }{resource.address.state
      ? `, ${resource.address.state}`
      : ''
    }{resource.address.country
      ? `, ${resource.address.country}`
      : ''}
    {resource.address.postalCode ?? ""}
{/if}
  