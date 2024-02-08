<script lang="ts">
  import { SOF_HOSTS } from './config';
  import type { IPSRetrieveEvent, SOFHost } from './types';
  import { authorize, getResources } from './sofClient.js';
  import { createEventDispatcher, onMount } from 'svelte';

  const resourceDispatch = createEventDispatcher<{'ips-retrieved': IPSRetrieveEvent}>();
  let processing = false;
  let fetchError = "";
  let result: IPSRetrieveEvent = {
    ips: undefined
  };

  let sofHostSelection = SOF_HOSTS[0].id;
  let sofHost:SOFHost | undefined = SOF_HOSTS.find(e => e.id == sofHostSelection);

  async function authorizeClient() {
    fetchError = "";
    try {
      if (sofHost) {
        authorize(sofHost.url, sofHost.clientId);
      }
    } catch (e) {
      console.error('Failed', e);
      fetchError = "Unable to authorize account. Please log out and try again later.";
    }
  }

  onMount(async function() {
    let key = sessionStorage.getItem('SMART_KEY');
    if (key) {
      let token = sessionStorage.getItem(JSON.parse(key));
      if (token) {
        token = JSON.parse(token);
        await fetchData();
        return;
      }
    }
    authorizeClient();
  });

  async function fetchData() {
    try {
      processing = true;
      let resources = await getResources();
      // TODO: build IPS structure
      // result.ips = toIPS(resources);
      result.ips = resources;
      console.log(resources);
      processing = false;
      return resourceDispatch('ips-retrieved', result);
    } catch (e) {
      processing = false;
      console.error("Error while fetching data", e);
      fetchError = "Unable to fetch summary. Please try again later.";
    }
  }
</script>

<span class="text-danger">{fetchError}</span>
