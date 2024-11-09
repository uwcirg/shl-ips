<script lang="ts">
  import {
    Col,
    Row
  } from 'sveltestrap';
  import Header from '$lib/components/layout/Header.svelte';
  import Banner from '$lib/components/layout/Banner.svelte';
  import { NavLinks } from '$lib/utils/types';

</script>

<Header content={[NavLinks.Home, NavLinks.Languages]}/>
<Banner title="International Patient Summary Viewer"/>
<Row class="main-row">
  <Col>
    <slot />
  </Col>
</Row>

<style>
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
  :global(.navbar .container-fluid) {
    padding: 0px;
  }
</style>
