<script lang="ts">
  import type { Encounter } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import EncounterCard from '$lib/components/resource-templates/EncounterCard.svelte';

  // Used when an Encounter is shown on its own: none of the resources it references could be
  // grouped with it, so its provider, participants and locations show their display text.
  // The surrounding list supplies the Encounter's "View" button, so none is rendered here.
  export let content: ResourceTemplateParams<Encounter>; // Define a prop to pass the data to the component

  let resource: Encounter;
  $: if (content) resource = content.resource;
</script>

<EncounterCard encounter={resource} />
