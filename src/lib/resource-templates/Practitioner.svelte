<script>
    import { Badge, Card, CardBody, CardText } from 'sveltestrap';
    export let resource;
</script>
  
<strong>
    {resource.name[0].prefix ?? ""}
    {resource.name[0].given.join(' ')}
    {resource.name[0].family}
</strong>
<br>
Gender: {resource.gender}
{#if resource.address}
    <table class="table table-bordered table-sm">
        <thead>
            <tr>
            <th scope="col">Address</th>
            </tr>
        </thead>
        {#each resource.address as address}
            <tr>
            <td>
                {#each address.line as line}
                    {line}<br />
                {/each}
                {address.city}{
                    address.state
                        ? `, ${address.state}`
                        : ''
                }{address.country
                    ? `, ${address.country}`
                    : ''}
                {address.postalCode}
            </td>
            </tr>
        {/each}
    </table>
{/if}
  