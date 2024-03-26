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
  import { SOF_HOSTS, BACK_URL, LOGOUT_URL } from '$lib/config';
  import { goto } from '$app/navigation';
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

  function logout() {
    closeNav();
    let keyRaw = sessionStorage.getItem('SMART_KEY');
    if (keyRaw != undefined) {
      let key = JSON.parse(keyRaw);
      sessionStorage.removeItem(key);
    }
    sessionStorage.removeItem('SMART_KEY');
    goto(LOGOUT_URL);
  }
</script>

<Container class="main" fluid>
<Styles />
<Navbar class="navbar d-none d-sm-block" expand="sm" style="background: #325c33; border-bottom: 1px solid rgb(204, 204, 204); margin-bottom: 10px">
  <Nav navbar pills>
    <NavItem>
      <NavLink active style="background-color:white" class="text-black" href={BACK_URL} on:click={closeNav}><Icon name="arrow-left"/> Back</NavLink>
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
        <NavLink class="text-white" href={BACK_URL} on:click={closeNav}><Icon name="arrow-left"/> Back</NavLink>
      </NavItem>
      <NavItem>
        <NavLink class="text-white" on:click={logout}>Log Out</NavLink>
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
      <p><strong>If you have any questions or problems using the system, please get in touch at clarawb@uw.edu for assistance.</strong></p>
    </footer>
  </Col>
</Row>
{/if}
</Container>
