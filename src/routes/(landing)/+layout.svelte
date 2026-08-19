<script lang="ts">
  import {
    Container
  } from '@sveltestrap/sveltestrap';
  import Header from '$lib/components/layout/Header.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
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

 <div style="position:absolute; inset:0;
    background: linear-gradient(180deg, #2A6AC0 0%, #1E5AA8 42%, #16467F 100%)"></div>

 <div style="position:absolute; top:0; left:0; right:0; height:44%; zIndex:1;
   pointerEvents:'none';
   background: linear-gradient(180deg, #fff 0%, #fff 30%, rgba(255,255,255,.72) 60%, rgba(255,255,255,0) 100%)"/>
<Container class="main" fluid>
  <Header />
  <div class="main-content">
    <slot />
  </div>
</Container>

