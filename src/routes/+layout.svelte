<script lang="ts">
  import { setContext, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import {
    Col,
    Collapse,
    Container,
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
  import { SOFClient } from '$lib/sofClient';
  import { SOF_HOSTS } from '$lib/config';
  let shlStore = writable<SHLAdminParams>(undefined);
  setContext('shlStore', shlStore);

  let shlClient = new SHLClient();
  setContext('shlClient', shlClient);

  // TODO: Consider passing full configuration
  // TODO: Consider array config
  let sofClient = new SOFClient(SOF_HOSTS[0]);
  setContext('sofClient', sofClient);
  let initialized = false;

  onMount(() => {
    sofClient.initialize()?.then(() => {
      initialized = true;
    });
  });

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
<Navbar class="navbar d-none d-sm-block" expand="sm" style="background: #325c33; border-bottom: 1px solid rgb(204, 204, 204); margin-bottom: 10px">
  <Nav navbar pills>
    <NavItem>
      <NavLink active style="background-color:white" class="text-black" href="https://inform.dev.cirg.uw.edu/" on:click={closeNav}><Icon name="arrow-left"/> Back</NavLink>
    </NavItem>
  </Nav>
  <NavbarBrand class="mx-auto">
    <a href="https://inform.dev.cirg.uw.edu" rel="noreferrer" target="_blank"><div style="background:#325c33;"><Image alt="Let's Talk Tech Logo" width="240" src="/img/ltt-logo.svg"/></div></a>
  </NavbarBrand>
  <Nav pills>
    <NavItem active>
      <NavLink active style="background-color:white" class="text-black" href="https://inform.dev.cirg.uw.edu/help" on:click={closeNav}>Log Out</NavLink>
    </NavItem>
  </Nav>
</Navbar>
<Navbar class="navbar d-block d-sm-none" expand="sm" style="background: #325c33; border-bottom: 1px solid rgb(204, 204, 204); margin-bottom: 10px">
  <NavbarBrand>
    <a href="https://inform.dev.cirg.uw.edu" rel="noreferrer" target="_blank"><div style="background:#325c33;"><Image alt="Let's Talk Tech Logo" width="240" src="/img/ltt-logo.svg"/></div></a>
  </NavbarBrand>
  <NavbarToggler style="background-color: white" on:click={() => (isOpen = !isOpen)} />
  <Collapse {isOpen} navbar expand="sm" on:update={handleUpdate}>
    <Nav class="ms-auto" navbar>
      <NavItem>
        <NavLink class="text-white" href="https://inform.dev.cirg.uw.edu/" on:click={closeNav}><Icon name="arrow-left"/> Back</NavLink>
      </NavItem>
      <NavItem>
        <NavLink class="text-white" href="https://letstalktech.uw.edu/help" on:click={closeNav}>Log Out</NavLink>
      </NavItem>
    </Nav>
  </Collapse>
</Navbar>
{#if !initialized}
  Loading...
{:else}
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
{/if}
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
    padding: 0,0.5rem;
  }
</style>
