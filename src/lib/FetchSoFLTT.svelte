<script lang="ts">
  import { getContext } from 'svelte';
  import type { ResourceRetrieveEvent } from './types';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { SOFClient } from './sofClient';

  const resourceDispatch = createEventDispatcher<{'updateResources': ResourceRetrieveEvent}>();

  let sofClient: SOFClient = getContext('sofClient');

  let processing = false;
  let fetchError = "";
  let result: ResourceRetrieveEvent = {
    resources: undefined
  };

  onMount(async function() {
    await fetchData();
    return;
  });

  async function fetchData() {
    try {
      processing = true;
      let resources = await sofClient.getResources();
      if (resources.length == 0) {
        throw Error("No resources for the authenticated user were returned");
      }
      result.resources = resources;
      console.log(resources);
      processing = false;
      return resourceDispatch('updateResources', result);
    } catch (e) {
      processing = false;
      console.error("Error while fetching data: ", e);
      fetchError = "Unable to fetch summary. Please try again later.";
    }
  }
</script>

<span class="text-danger">{fetchError}</span>
