<script lang="ts">
  import {
    Container,
    Styles
  } from 'sveltestrap';
  import { onMount, onDestroy, setContext } from 'svelte';
  import {writable } from 'svelte/store';
  import { AuthService } from '$lib/utils/AuthService';
  import { SHLClient, type SHLAdminParams } from '$lib/utils/managementClient';
  import Header from '$lib/components/layout/Header.svelte';
  import Footer from '$lib/components/layout/Footer.svelte';

  let shlStore = writable<SHLAdminParams[]>([]);
  setContext('shlStore', shlStore);

  let authService = AuthService.Instance;
  setContext('authService', authService);

  let shlClient = new SHLClient(authService);
  setContext('shlClient', shlClient);

  let reset = writable(0);
  setContext('reset', reset);

  const MODE_KEY = 'demo_mode';
  let mode = writable('normal');
  window.localStorage[MODE_KEY] ? mode.set(JSON.parse(window.localStorage[MODE_KEY])) : mode.set('normal');
  setContext('mode', mode);

  let isOpen = writable(false);
  setContext('isOpen', isOpen);

  $: {
    if ($mode) window.localStorage[MODE_KEY] = JSON.stringify($mode);
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

  onMount(() => {
    // Initial call to set pagination size on page load
    dispatchPageSize()

    // Call dispatchPageSize() on window resize
    window.addEventListener('resize', dispatchPageSize);

    authService.getUser().then((user) => {
      if (user) {
        let now = Date.now() / 1000;
        if ((user.expires_at ?? 0) < now) {
          return user;
        }
      }
      return undefined;
    }).then(async (user) => {
      if (!user) {
        return undefined;
      }
      window.dispatchEvent(new CustomEvent('userFound', { 
        detail: { message: 'Hello from another component!' } 
      }));
      $shlStore = await shlClient.getUserShls();
      return user;
    });
  });
  onDestroy(() => {
    window.removeEventListener('resize', dispatchPageSize);
  });

</script>

<Container class="main" fluid>
  <Styles />
  <Header />
  <div class="main-content">
    <slot />
  </div>
  <Footer />
</Container>

<style>
  /* Handle scroll gutter */
  :global(.main) {
    position: relative;
    left: calc((100vw - 100%) / 2);
  }
  :global(.main-content) {
    flex-grow: 1;
  }
  :global(.main-row) {
    flex-grow: 1;
  }

  :global(div.container-fluid.main) {
    min-height: 100%;
    margin-right: auto;
    margin-left: auto;
    max-width: 800px;
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
