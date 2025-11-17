<script lang="ts">
  import {
    Container,
    Styles
  } from 'sveltestrap';
  import { onMount, onDestroy, setContext } from 'svelte';
  import { writable, type Writable } from 'svelte/store';
  import { AuthService } from '$lib/utils/AuthService';
  import { SHLClient } from '$lib/utils/managementClient';
  import { FHIRDataService } from '$lib/utils/FHIRDataService';
  import Header from '$lib/components/layout/Header.svelte';
  import Footer from '$lib/components/layout/Footer.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import type { IAuthService, SHLAdminParams } from '$lib/utils/types';

  let authService: IAuthService = new AuthService();
  setContext('authService', authService);

  let fhirDataService: FHIRDataService = new FHIRDataService(authService);
  setContext('fhirDataService', fhirDataService);

  let shlClient: SHLClient = new SHLClient(authService);
  setContext('shlClient', shlClient);

  let shlStore: Writable<SHLAdminParams[]> = writable([]);
  setContext('shlStore', shlStore);

  let reset: Writable<number> = writable(0);
  setContext('reset', reset);

  const MODE_KEY = 'demo_mode';
  let mode: Writable<string> = writable('normal');
  if (INSTANCE_CONFIG.advanced && window.localStorage[MODE_KEY]) {
    // set demo mode based on local storage state
    mode.set(JSON.parse(window.localStorage[MODE_KEY]));
  } else {
    $mode = 'normal';
    window.localStorage.removeItem(MODE_KEY);
  }
  setContext('mode', mode);

  let isOpen: Writable<boolean> = writable(false);
  setContext('isOpen', isOpen);

  $: {
    if ($mode && INSTANCE_CONFIG.advanced) window.localStorage[MODE_KEY] = JSON.stringify($mode);
  }

  let prevPageSize: number | undefined;
  // Toggle class based on window width
  function dispatchPageSize() {
    var width = window.innerWidth
    let border = 800;
    if (width < border && (prevPageSize === undefined || prevPageSize >= border)) {
      window.dispatchEvent(new CustomEvent('page-sm', {
        detail: {}
      }));
    } else if (width >= border && (prevPageSize === undefined || prevPageSize < border)) {
      window.dispatchEvent(new CustomEvent('page-md', {
        detail: {}
      }));
    }
    prevPageSize = width;
  }

  onMount(async () => {
    await authService.isAuthenticated();
    // Initial call to set pagination size on page load
    dispatchPageSize()

    // Call dispatchPageSize() on window resize
    window.addEventListener('resize', dispatchPageSize);
  });
  onDestroy(() => {
    window.removeEventListener('resize', dispatchPageSize);
  });

</script>

<svelte:head>
    <title>{INSTANCE_CONFIG.title}</title>
    <link rel="icon" href={`${INSTANCE_CONFIG.imgPath}/favicon.ico`} type="image/x-icon">
    <link rel="preload" as="image" href={`${INSTANCE_CONFIG.imgPath}/company-logo.png`} />
    <link rel="preload" as="image" href={`${INSTANCE_CONFIG.imgPath}/logo.png`} />
    <link rel="preload" as="image" href={`${INSTANCE_CONFIG.imgPath}/divider.png`} />
</svelte:head>

<Container class="main" fluid>
  <Styles />
  <Header />
  <div class="main-content">
    <slot />
  </div>
  <Footer />
</Container>

<style>
  .main-content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    margin-top: 1.5rem;
    padding: 0 1rem;
  }

  :global(div.container-fluid.main) {
    /* Handle scroll gutter */
    position: relative;

    height: 100vh;
    margin-right: auto;
    margin-left: auto;
    max-width: 1200px;
    display: flex;
    flex-direction: column;
  }
  :global(html, body) {
    height: 100%;
  }
  /* Body font */
  /* :global(body) {
    font-family: 'Open Sans', sans-serif !important;
  } */
  :global(.navbar .container-fluid) {
    padding: 0px;
  }
</style>
