<script lang="ts">
  import { PastWorkSection, type PastJobEntry } from '$lib';

  // A section used on its own, without an OdhFormProvider

  export let entries: PastJobEntry[] = [];
  export let createId: (() => string) | undefined = undefined;
</script>

<PastWorkSection bind:entries {createId} />
<output data-testid="entries">{JSON.stringify(entries)}</output>
