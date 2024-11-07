<script lang="ts">
  import type { ContactPoint } from 'fhir/r4';

  export let contactPoint: ContactPoint[] | ContactPoint | undefined;
  let viewContactPoint: ContactPoint[] | undefined;

  $: {
    if (contactPoint) {
      viewContactPoint = (
        Array.isArray(contactPoint) ? contactPoint : [contactPoint]
      ) as ContactPoint[];
    }
  }
</script>

{#if viewContactPoint}
  <div class="ips-section-table">
    <table class="table table-bordered table-sm">
      <thead>
        <tr><th colspan="3">Contact Information</th></tr>
      </thead>
      <tr>
        {#each viewContactPoint as cp}
          <td>{cp.system ?? ''}</td>
          <td>{cp.use ?? ''}</td>
          <td>{cp.value ?? ''}</td>
        {/each}
      </tr>
    </table>
  </div>
{/if}
