<script lang="ts">
  import type { Address } from 'fhir/r4';

  export let address: Address[] | Address | undefined;
  let viewAddress: Address[] | undefined;

  $: {
    if (address) {
      viewAddress = (Array.isArray(address) ? address : [address]) as Address[];
    }
  }
</script>

{#if viewAddress}
  <div class="ips-section-table">
    <table class="table table-bordered table-sm">
      <thead>
        <tr>
          <th scope="col">Use</th>
          <th scope="col">Address</th>
        </tr>
        <tr />
      </thead>
      {#each viewAddress as a}
        <tr>
          <td>{a.use ?? ''}</td>
          <td>
            {#if a.line}
              {#each a.line as line}
                {line}<br />
              {/each}
            {/if}
            {a.city ?? '[Unknown City]'}{a.state ? `, ${a.state}` : ''}{a.country
              ? `, ${a.country}`
              : ''}
            {a.postalCode ?? ''}
          </td>
        </tr>
      {/each}
    </table>
  </div>
{/if}
