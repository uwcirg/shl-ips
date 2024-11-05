<script lang="ts">
  import {
    Col,
    Collapse,
    Image,
    Nav,
    Navbar,
    NavbarBrand,
    NavItem,
    NavLink,
    NavbarToggler,
    Row
  } from 'sveltestrap';
  import LanguageMenu from '$lib/layout/navbar/LanguageMenu.svelte';
  import Banner from '$lib/layout/Banner.svelte';

  let isOpen = false;
  function handleUpdate(event) {
    isOpen = event.detail.isOpen;
  }
  function closeNav() {
    isOpen = false;
  }
</script>

<Navbar color="light" light expand="md" style="border-bottom: 1px solid rgb(204, 204, 204);">
  <NavbarBrand href="https://doh.wa.gov/" target="_blank">
    <Row>
      <Col>
        <Image
          id="nav-image"
          alt="Washington State Department of Health Logo"
          src="/img/doh_logo_doh-black.png"
        />
      </Col>
      <Col style="vertical-align:middle" class="d-none d-sm-block align-items-center">
        <div class="nav-text mt-2">
          <span>Washington State</span>
          <p style="margin: 10px; padding: 0px: line-height: 0;" />
          <span>Department of Health</span>
        </div>
      </Col>
    </Row>
  </NavbarBrand>
  <NavbarToggler on:click={() => (isOpen = !isOpen)} />
  <Collapse {isOpen} navbar expand="md" on:update={handleUpdate}>
    <Nav class="ms-auto" navbar>
      <NavItem>
        <NavLink href="/home" on:click={closeNav}>Home</NavLink>
      </NavItem>
      <LanguageMenu />
    </Nav>
  </Collapse>
</Navbar>
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
