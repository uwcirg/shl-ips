<script>
  import { Card, CardBody, CardText } from 'sveltestrap';

  export let resource;
</script>

<Card>
  <CardBody>
    <CardText>
      {resource.name.given.join(' ')}, {resource.name.family}
      Birth Date: {resource.birthDate}
      Gender: {resource.gender}
      {#if resource.telecom}
        <table class="table table-bordered table-sm">
          <thead>
            <tr><th colspan="2">Telecom</th></tr>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Use</th>
              <th scope="col">Value</th>
            </tr>
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
                {address[0].city}{address[0].state ? `, ${address[0].state}` : ''}{address[0]
                  .country
                  ? `, ${address[0].country}`
                  : ''}
                {address.postalCode}
              </td>
            </tr>
          {/each}
        </table>
      {/if}
      {#if resource.contact}
        Emergency Contact:
        {#each resource.contact as contact}
          {contact.name.given.join(' ')}, {contact.name.family}
          Birth Date: {contact.birthDate}
          Gender: {contact.gender}
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
              {#each contact.address as address}
                <tr>
                  <td>
                    {#each address.line as line}
                      {line}<br />
                    {/each}
                    {address[0].city}{address[0].state ? `, ${address[0].state}` : ''}{address[0]
                      .country
                      ? `, ${address[0].country}`
                      : ''}
                    {address.postalCode}
                  </td>
                </tr>
              {/each}
            </table>
          {/if}
        {/each}
      {/if}
    </CardText>
  </CardBody>
</Card>
