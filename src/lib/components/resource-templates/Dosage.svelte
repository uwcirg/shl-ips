<script lang="ts">
  import type { Dosage } from 'fhir/r4';

  export let dosages: Dosage[] | undefined;
</script>

{#if dosages && dosages.length > 0}
  {#each dosages as dosage}
    {#if dosage.text}
      Dosage: {dosage.text}
    {:else if dosage.asNeededBoolean}
      Dosage: as needed
    {:else}
      <span class="text-muted">No dosage information</span>
    {/if}
    {#if dosage.route?.coding || dosage.doseAndRate || dosage.timing?.repeat}
      <table class="table table-bordered table-sm">
        <thead>
          <tr><th colspan="5">Dosage</th></tr>
          <tr>
            <th scope="col">Route</th>
            <th scope="col">Qty</th>
            <th scope="col">Unit</th>
            <th scope="col">Freq. Qty</th>
            <th scope="col">Freq. Period</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{dosage.route?.coding?.[0].display ?? ''}</td>
            <td>{dosage.doseAndRate?.[0].doseQuantity?.value ?? ''}</td>
            <td>{dosage.doseAndRate?.[0].doseQuantity?.unit ?? ''}</td>
            <td>{dosage.timing?.repeat?.count ?? ''}</td>
            <td>
              {#if dosage.timing?.repeat?.period && dosage.timing?.repeat?.periodUnit}
                {dosage.timing?.repeat?.period}{dosage.timing?.repeat?.periodUnit}
              {/if}
            </td>
          </tr>
      </tbody>
      </table>
    {:else}
      <br>
    {/if}
  {/each}
{:else}
  <span class="text-muted">No dosage information</span><br>
{/if}
