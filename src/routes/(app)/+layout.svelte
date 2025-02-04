<script lang="ts">
  import { goto } from '$app/navigation';
  import { getContext, onMount, setContext } from 'svelte';
  import { writable, type Writable } from 'svelte/store';
  import {
    Dropdown,
    Col,
    Collapse,
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
    Row
  } from 'sveltestrap';
  import { SHLClient, type SHLAdminParams } from '$lib/utils/managementClient';
  import LanguageMenu from '$lib/components/layout/LanguageMenu.svelte';
  import Banner from '$lib/components/layout/Banner.svelte';
  import { AuthService } from '$lib/utils/AuthService';
  import { VERSION_STRING } from '$lib/config';
  import { User } from 'oidc-client-ts';

  let shlStore = writable<SHLAdminParams[]>([]);
  setContext('shlStore', shlStore);

  let authService = AuthService.Instance;
  setContext('authService', authService);

  let shlClient = new SHLClient(authService);
  setContext('shlClient', shlClient);

  let reset = writable(0);
  setContext('reset', reset);

  let isOpen: Writable<boolean> = getContext('isOpen');

  let mode: Writable<string> = getContext('mode');

  let currentUser: Promise<User | undefined>;
  
  onMount(async () => {
    window.onscroll = function() {scrollFunction()};
    scrollFunction();
    $isOpen = false;

    let newUser: User | undefined;
    try {
      newUser = await authService.signinCallback();
    } catch (error) {
      console.warn("No authentication parameters found, checking for current user");
    } finally {
      currentUser = authService.getUser().then((user) => {
        if (user) {
          let now = Date.now() / 1000;
          if ((user.expires_at ?? 0) < now) {
            return user ?? undefined;
          }
        }
        if (!user) {
          return authService.login().then(() => {
            return authService.getUser().then((user) => user ?? undefined);
          });
        } else {
          if (newUser) {
            let redirectUrl = authService.getRedirectUrl();
            if (redirectUrl) {
              goto(redirectUrl);
            } else {
              goto('/home');
            }
          }
        }
      }).then(async (user) => {
        $shlStore = await shlClient.getUserShls();
        return user;
      });
    }
  });

  function scrollFunction() {
    if (window.scrollY > 40) {
      let links = document.getElementsByClassName("nav-link");
      if (links.length == 0) return;
      for(let i = 0; i < links.length; i++) {
        links[i].classList.add("scrolling");
      }
      document.getElementById("nav-image")?.classList.add("scrolling");
      document.getElementsByClassName("navbar")?.[0]?.classList.add("scrolling");
      let es = document.getElementsByClassName("nav-text");
      if (es.length == 0) return;
      for(let i = 0; i < es.length; i++) {
        es[i].classList.add("scrolling");
      }
    } else if (window.scrollY == 0) {
      let links = document.getElementsByClassName("nav-link");
      if (links.length == 0) return;
      for(let i = 0; i < links.length; i++) {
        links[i].classList.remove("scrolling");
      }
      document.getElementById("nav-image")?.classList.remove("scrolling");
      document.getElementsByClassName("navbar")?.[0]?.classList.remove("scrolling");
      let es = document.getElementsByClassName("nav-text");
      if (es.length == 0) return;
      for(let i = 0; i < es.length; i++) {
        es[i].classList.remove("scrolling");
      }
    }
  }

  function handleUpdate(event: any) {
    $isOpen = event.detail.isOpen;
  }

</script>
{#await currentUser}
  Authorizing...
{:then}
<Navbar class="sticky-top" color="light" light expand="md" style="border-bottom: 1px solid rgb(204, 204, 204);">
  <NavbarBrand href="https://doh.wa.gov/" target="_blank">
    <Row>
      <Col>
        <Image id="nav-image" alt="Washington State Department of Health Logo" src="/img/doh_logo_doh-black.png"/>
      </Col>
    </Row>
  </NavbarBrand>
  <NavbarToggler on:click={() => ($isOpen = !$isOpen)} />
  <Collapse class="flex-column" isOpen={$isOpen} navbar expand="md" on:update={handleUpdate}>
      <Nav class="ms-auto" navbar>
        <LanguageMenu />
      </Nav>
      <Nav class="ms-auto" navbar>
        <NavItem>
          <NavLink href="/home">Home</NavLink>
        </NavItem>
        <Dropdown nav inNavbar class="navbar-dropdown" size="sm" direction="down">
          <DropdownToggle color="primary" nav caret>My Links</DropdownToggle>
          <DropdownMenu end style="max-height: 500px; overflow:auto">
            <DropdownItem
              on:click={() => {
                goto("/create");
              }}>
              <Icon name="plus-lg" /> Add New SHLink
            </DropdownItem>
            {#if $shlStore.length > 0}
              <DropdownItem divider />
              <DropdownItem header>Your Saved SHLinks</DropdownItem>
              {#each $shlStore as shl, i}
                <DropdownItem
                  on:click={() => {
                  goto('/view/' + shl.id);
                }}>{shl.label || `SHLink ${i + 1}`}</DropdownItem>
              {/each}
            {/if}
          </DropdownMenu>
        </Dropdown>
        {#await authService.getProfile()}
          <NavItem>
            <NavLink on:click={() => authService.login()}><Icon name="person-circle"/> Sign In</NavLink>
          </NavItem>
        {:then profile}
          {#if profile}
            <Dropdown nav inNavbar class="navbar-dropdown" size="sm" direction="down">
              <DropdownToggle color="primary" nav caret><Icon name="person-circle"/> Account</DropdownToggle>
              <DropdownMenu end style="max-height: 500px; overflow:auto">
                <DropdownItem header>Welcome, {profile.given_name}</DropdownItem>
                <DropdownItem
                  on:click={() => {
                    authService.logout();
                  }}><Icon name="box-arrow-right"/> Sign Out</DropdownItem>
                  <DropdownItem divider />
                  <DropdownItem header>Demo Options</DropdownItem>
                  <DropdownItem
                    on:click={() => {
                      $mode = ($mode === 'advanced' ? 'normal' : 'advanced');
                  }}>
                    <Row class="mr-0" style="min-width:240px">
                      <Col class="d-flex justify-content-start align-items-center pe-0">
                        {$mode === "advanced" ? "Hide" : "Show"} Advanced Features
                      </Col>
                      <Col class="d-flex justify-content-end ps-0">
                        {#if $mode == 'advanced'}
                        <Icon class="text-primary" name="toggle-on"></Icon>
                        {:else}
                        <Icon class="text-secondary" name="toggle-off"></Icon>
                        {/if}
                      </Col>
                    </Row>
                  </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          {:else}
            <NavItem>
              <NavLink on:click={() => authService.login()}><Icon name="person-circle"/> Sign In</NavLink>
            </NavItem>
          {/if}
        {/await}
      </Nav>
  </Collapse>
</Navbar>
<Banner title="International Patient Summary Prototype"/>

<Row class="main-row">
  <Col>
    <slot />
  </Col>
</Row>
<Row>
  <Col style="margin-top: 20px; padding: 20px; border-top: 1px solid rgb(204, 204, 204);" >
    <footer>
      This demonstration shows how to create a 
      <a
        target="_blank"
        rel="noreferrer"
        href="https://docs.smarthealthit.org/smart-health-links/user-stories"
      >
        SMART Health Link
      </a>
      for any FHIR
      <a href="https://build.fhir.org/ig/HL7/fhir-ips/" target="_blank" rel="noreferrer">
        International Patient Summary
      </a>
      document. SHLinks can be shared by copy/paste, or by presenting a QR code.
      {#if $mode === "advanced"}
        For more information, view the source code and license at
        <a href="https://github.com/uwcirg/shl-ips" target="_blank" rel="noreferrer">
          https://github.com/uwcirg/shl-ips
        </a>. {VERSION_STRING ? "Site version: " + VERSION_STRING : ""}
      {/if}
    </footer>
  </Col>
</Row>
{/await}
