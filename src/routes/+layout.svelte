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
  import { SOF_HOSTS, BACK_URL, INACTIVITY_TIMEOUT } from '$lib/config';
  import { goto } from '$app/navigation';
  import SessionStatus from '$lib/SessionStatus.svelte';

  let shlStore = writable<SHLAdminParams>(undefined);
  setContext('shlStore', shlStore);

  let shlClient = new SHLClient();
  setContext('shlClient', shlClient);

  // TODO: Consider passing full configuration
  // TODO: Consider array config
  let sofClient: SOFClient = new SOFClient(SOF_HOSTS[0]);
  setContext('sofClient', sofClient);
  let initialized = false;
  let validSession = false;

  let inactivityTimer: NodeJS.Timeout | undefined;
  function resetInactivityTimer() {
    if (inactivityTimer !== undefined) {
        clearTimeout(inactivityTimer);
      }
      inactivityTimer = undefined;
      inactivityTimer = setTimeout(logout, INACTIVITY_TIMEOUT);
  }

  let stateChecker: NodeJS.Timeout = setInterval(sofClient.checkState, 60000);

  function initializeClient() {
    sofClient.initialize()?.then(() => {
      if (sofClient.getPatientID()) {
        initialized = true;
        resetInactivityTimer();
      } else {
        sofClient.reset();
        initializeClient();
      }
    });
  }

  onMount(() => {
    initializeClient();
    document.addEventListener('click', resetInactivityTimer);
    document.addEventListener('scroll', resetInactivityTimer);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === "visible") {
        resetInactivityTimer();
      }
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
    goto('/logout');
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
      <NavLink active style="background-color:white" class="text-black" on:click={logout}>Log Out</NavLink>
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
{#if initialized}
<SessionStatus/>
<Row class="main-row">
  <Col>
    <slot />
  </Col>
</Row>
<Row>
  <Col style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgb(204, 204, 204);" >
    <footer>
      <Row class="justify-content-center">
        <p><center>If you have any questions or problems using the system, please get in touch at <a  href="mailto:clarawb@uw.edu">clarawb@uw.edu</a> for assistance.</center></p>
      </Row>
    </footer>
  </Col>
</Row>
{/if}
</Container>
