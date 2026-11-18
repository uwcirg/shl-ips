<script lang="ts">
  import type { Observation } from 'fhir/r4';
  import { EmploymentStatusSection, OdhFormProvider, PastWorkSection } from '$lib';

  // An app's own layout: only employment status and past work, with its own buttons

  export let resources: Observation[] | undefined = undefined;
  export let onsave: (resources: Observation[]) => void;
  export let createId: (() => string) | undefined = undefined;
  export let duplicateSection = false;
</script>

<OdhFormProvider {resources} {onsave} {createId} let:submit let:reset>
  <h2>Status</h2>
  <EmploymentStatusSection />
  <h2>Past</h2>
  <PastWorkSection />
  {#if duplicateSection}
    <PastWorkSection />
  {/if}
  <button on:click={submit}>Submit</button>
  <button on:click={reset}>Reset</button>
</OdhFormProvider>
