<script lang="ts">
  import {
    Col,
    Row
  } from 'sveltestrap';
  import { getContext, setContext } from 'svelte';
  import { writable, type Writable } from 'svelte/store';
  import { SHLClient, type SHLAdminParams } from '$lib/utils/managementClient';
  import { NavLinks } from '$lib/utils/types';
  import Header from '$lib/components/layout/Header.svelte';
  import Banner from '$lib/components/layout/Banner.svelte';

  const LOCAL_STORAGE_KEY = 'shlips_store_shls';
  let shlStore = writable<SHLAdminParams[]>(
    window.localStorage[LOCAL_STORAGE_KEY] ? JSON.parse(window.localStorage[LOCAL_STORAGE_KEY]) : []
  );

  setContext('shlStore', shlStore);

  let shlClient = new SHLClient();
  setContext('shlClient', shlClient);

  let reset = writable(0);
  setContext('reset', reset);

  // let navIsOpen: Writable<boolean> = getContext('isOpen');

  $: {
    if ($shlStore) window.localStorage[LOCAL_STORAGE_KEY] = JSON.stringify($shlStore);
  }

</script>

<Header content={[NavLinks.Home, NavLinks.Actions, NavLinks.Languages]}/>
<Banner title="International Patient Summary Prototype"/>
<Row class="main-row">
  <Col>
    <slot />
  </Col>
</Row>
