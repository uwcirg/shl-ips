<script lang="ts">
  import { goto } from '$app/navigation';
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import {
    Dropdown,
    Col,
    Collapse,
    Container,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Icon,
    Image,
    Nav,
    Navbar,
    NavbarBrand,
    NavItem,
    NavLink,
    NavbarToggler,
    Row,
    Styles
  } from 'sveltestrap';
  import { SHLClient, type SHLAdminParams } from '$lib/managementClient';

  const LOCAL_STORAGE_KEY = 'shlips_store_shls';
  let shlStore = writable<SHLAdminParams[]>(
    window.localStorage[LOCAL_STORAGE_KEY] ? JSON.parse(window.localStorage[LOCAL_STORAGE_KEY]) : []
  );

  $: {
    if ($shlStore) window.localStorage[LOCAL_STORAGE_KEY] = JSON.stringify($shlStore);
  }
  setContext('shlStore', shlStore);

  let shlClient = new SHLClient();
  setContext('shlClient', shlClient);

  let reset = writable(0);
  setContext('reset', reset);

  let isOpen = false;
  function handleUpdate(event) {
    isOpen = event.detail.isOpen;
  }
  function closeNav() {
    isOpen = false;
  }
</script>

<Container class="main" fluid>
<Styles />
<Navbar color="light" light expand="md" style="border-bottom: 1px solid rgb(204, 204, 204);">
  <NavbarBrand>
    <a href="https://doh.wa.gov/" rel="noreferrer" target="_blank"><Image alt="Washington State Department of Health Logo" width="240" src="/img/doh_logo_doh-black.png"/></a>
  </NavbarBrand>
  <NavbarToggler on:click={() => (isOpen = !isOpen)} />
  <Collapse {isOpen} navbar expand="md" on:update={handleUpdate}>
    <Nav class="ms-auto" navbar>
      <NavItem>
        <NavLink href="/home" on:click={closeNav}>Home</NavLink>
      </NavItem>
      <NavItem>
        <NavLink on:click={closeNav}>Login</NavLink>
      </NavItem>
      <Dropdown nav inNavbar size="sm" direction="down">
        <DropdownToggle color="primary" nav caret>Actions</DropdownToggle>
        <DropdownMenu end>
          <DropdownItem
            on:click={() => {
              closeNav();
              goto("/create");
            }}>Add New SHLink</DropdownItem>
          <DropdownItem
            on:click={() => {
              closeNav();
              $shlStore = [];
              goto('/');
            }}>Reset Demo</DropdownItem>
          {#if $shlStore.length > 0}
            <DropdownItem divider />
            <DropdownItem header>View Stored SHLinks</DropdownItem>
            {#each $shlStore as shl, i}
              <DropdownItem
                on:click={() => {
                closeNav();
                goto('/view/' + shl.id);
              }}>{shl.label || `SHLink ${i + 1}`}</DropdownItem>
            {/each}
          {/if}
        </DropdownMenu>
      </Dropdown>
    </Nav>
  </Collapse>
</Navbar>
<Row>
  <Col style="margin-bottom: 20px; border-bottom: 1px solid rgb(204, 204, 204);">
    <a href="\home"><Image alt="WA Verify Logo" width="200" src="/img/waverifypluslogo.png" style="align-self: center"></Image></a>
    <div style="vertical-align: middle; font-size: 18px; display: inline-block; padding-left: 17px; font-family: Verdana, sans-serif; color: rgb(34, 72, 156);">International Patient Summary</div>
  </Col>
</Row>
<Row class="main-row">
  <Col>
    <slot />
  </Col>
</Row>
<Row>
  <Col style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgb(204, 204, 204);" >
    <footer>
      This demonstration shows how to create a <a
        target="_blank"
        rel="noreferrer"
        href="https://docs.smarthealthit.org/smart-health-links/user-stories">SMART Health Link</a
      >
      for any FHIR
      <a href="https://build.fhir.org/ig/HL7/fhir-ips/" target="_blank" rel="noreferrer"
        >International Patient Summary</a
      >
      document. SHLinks can be shared by copy/paste, or by presenting a QR code. Source code and license at
      <a href="https://github.com/uwcirg/shl-ips" target="_blank" rel="noreferrer"
        >https://github.com/uwcirg/shl-ips</a
      >.
    </footer>
  </Col>
</Row>
</Container>

<style>
  :global(.main-row) {
    flex-grow: 1;
  }
  footer {
    margin-bottom: 1em;
    font-style: italic;
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
