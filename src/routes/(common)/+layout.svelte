<script lang="ts">
  import {
    Container
  } from '@sveltestrap/sveltestrap';
  import Header from '$lib/components/layout/Header.svelte';
  import ToastContainer from '$lib/components/layout/ToastContainer.svelte';
  import StickyNav from '$lib/components/layout/StickyNav.svelte';
  import Footer from '$lib/components/layout/Footer.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';

  import { getContext } from 'svelte';

  let navConfig: any = getContext('navConfig');
</script>

<svelte:head>
    <title>{INSTANCE_CONFIG.title}</title>
    <link rel="icon" href={`${INSTANCE_CONFIG.imgPath}/favicon.ico`} type="image/x-icon">
    <link rel="preload" as="image" href={`${INSTANCE_CONFIG.imgPath}/company-logo.png`} />
    <link rel="preload" as="image" href={`${INSTANCE_CONFIG.imgPath}/logo-60h.png`} />
    <link rel="preload" as="image" href={`${INSTANCE_CONFIG.imgPath}/divider.png`} />
</svelte:head>

<!-- Error testing -->
<!-- <Button on:click={() => { throw new Error('Test Error'); }}>Error</Button>
<Button on:click={() => { let a; a.b.c.d.e.f.g.h.i.j.k.l.m.n.o.p.q.r.s.t.u.v.w.x.y.z; }}>Error</Button> -->

<Container class="main" fluid>
  <Header />
  <div class="main-content">
    <slot />
  </div>
  <div class="sticky-bottom-nav">
    <ToastContainer />
    <StickyNav
      {...$navConfig}
    />
  </div>
  <Footer />
</Container>

<style>
  :global(.sticky-bottom-nav, .navbar) {
    margin-left: calc(-1 * var(--bs-gutter-x, 1.5rem) / 2);
    margin-right: calc(-1 * var(--bs-gutter-x, 1.5rem) / 2);
  }
</style>
