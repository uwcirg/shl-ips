<script lang="ts">
  import type { DateTimeFields } from '$lib/utils/types';
  import Date from '$lib/components/resource-templates/Date.svelte';

  // A date shown at the bottom of a resource, in smaller, lighter text so it reads as detail
  // rather than content. Give it `fields` (as for Date), or put custom text in the slot.
  //
  //   <DateLine label="Onset" fields={choiceDTFields("onset", resource)} />
  export let fields: DateTimeFields | undefined = undefined;
  // Says which date this is when a resource shows several; leave empty for a lone date
  export let label = '';
  export let period = false;
</script>

<div class="text-secondary small">
  {#if label}{label}: {/if}{#if fields}<Date {fields} {period} />{:else}<slot />{/if}
</div>
