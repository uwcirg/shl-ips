<script>
  import { Badge, Card, CardBody, CardText } from 'sveltestrap';
  export let resource;
</script>

<strong>
  {resource.name[0].given.join(' ')}
  {resource.name[0].family}
</strong>
<br>
Gender: {resource.gender}
{#if resource.telecom}
  <table class="table table-bordered table-sm">
      <thead>
          <tr><th colspan="3">Contact Information</th></tr>
      </thead>
      {#each resource.telecom as telecom}
          <tr>
              <td>{telecom.system}</td>
              <td>{telecom.use}</td>
              <td>{telecom.value}</td>
          </tr>
      {/each}
  </table>
{/if}
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
{#if resource.contact}
  {#each resource.contact as contact}
  <strong>Emergency Contact:
    {#if contact.name}
      {contact.name.given[0]}
      {contact.name.family}
    {/if}</strong>
    <br>
    {#if contact.birthDate}
      Birth Date: {contact.birthDate}<br>
      {/if}
      {#if contact.gender}
      Gender: {contact.gender ?? ""}<br>
      {/if}
      {#if contact.telecom}
          <table class="table table-bordered table-sm">
              <thead>
                  <tr><th colspan="2">Telecom</th></tr>
                  <tr>
                      <th scope="col">Type</th>
                      <th scope="col">Use</th>
                      <th scope="col">Value</th>
                  </tr>
              </thead>
              {#each contact.telecom as telecom}
                  <tr>
                      <td>{telecom.system}</td>
                      <td>{telecom.use}</td>
                      <td>{telecom.value}</td>
                  </tr>
              {/each}
          </table>
      {/if}
      {#if contact.address}
          <table class="table table-bordered table-sm">
              <thead>
                  <tr>
                      <th scope="col">Address</th>
                  </tr>
              </thead>
              <tr>
                <td>
                    {#each contact.address.line as line}
                    {line}<br />
                    {/each}
                    {contact.address.city}{contact.address.state ? `, ${contact.address.state}` : ''}{contact.address
                    .country
                    ? `, ${contact.address.country}`
                    : ''}
                    {contact.address.postalCode}
                </td>
            </tr>
          </table>
      {/if}
  {/each}
{/if}
