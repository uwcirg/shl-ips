<script lang="ts">
  import {
    Col,
    Collapse,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Icon,
    Image,
    Nav,
    NavItem,
    NavLink,
    Navbar,
    NavbarBrand,
    NavbarToggler,
    Row
  } from 'sveltestrap';
  import { onMount, onDestroy, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { type Writable } from 'svelte/store';
  import Banner from '$lib/components/layout/Banner.svelte';
  import LanguageMenu from '$lib/components/layout/LanguageMenu.svelte';
  import { User } from 'oidc-client-ts';
  import { AuthService } from '$lib/utils/AuthService';
  import { type SHLAdminParams, type SHLClient } from '$lib/utils/managementClient';

  let authService = AuthService.Instance;

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  
  let isOpen: Writable<boolean> = getContext('isOpen');

  let mode: Writable<string> = getContext('mode');

  let activeItem: ("home" | "summaries" | "create" | "") = "";
  $: {
    if ($page.url.pathname.includes("home")) {
      activeItem = "summaries";
    } else if ($page.url.pathname.includes("create")) {
      activeItem = "create";
    } else if ($page.url.pathname === "/") {
      activeItem = "home";
    } else {
      activeItem = "";
    }
  }

  let haveUser = false;
  function handleAuthenticationEvent(event) {
    haveUser = true;
    return;
  }

  onMount(async () => {
    $isOpen = false;
    setTimeout(() => {
      if (window.innerWidth < 800) {
        shrinkNav();
      }
    }, 10);

    window.addEventListener('userFound', handleAuthenticationEvent);
    addDynamicNavbarListeners();
  });
  onDestroy(() => {
    window.removeEventListener('userFound', handleAuthenticationEvent);
    removeDynamicNavbarListeners();
  });

  function closeNav() {
    $isOpen = false;
  }

  function shrinkNav() {
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
  }

  function growNav() {
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
  function removeDynamicNavbarListeners() {
    window.removeEventListener('page-sm', shrinkNav);
    window.removeEventListener('page-md', growNav);
  }

  let navOpening = false;
  function addDynamicNavbarListeners() {
    window.addEventListener('page-sm', shrinkNav);
    window.addEventListener('page-md', growNav);
    document.addEventListener('click', (event) => {
      // Ignore clicks on the navbar toggler
      if (event.target?.className?.includes('navbar-toggler')) return;
      // Ignore clicks on the dropdown toggle menu items
      if (event.target?.className?.includes('nav-link') && event.target?.className?.includes('dropdown-toggle')) {
        navOpening = true;
        setTimeout(() => {
          navOpening = false;
        }, 100);
        return;
      }
      closeNav();
    });
    document.addEventListener('keydown', (event) => {
      closeNav();
    });
  }

  function handleUpdate(event: any) {
    $isOpen = event.detail.isOpen;
  }
</script>
<Row>
  <Navbar sticky="top"color="light" light expand="sm" style="border-bottom: 1px solid rgb(204, 204, 204);">
    <NavbarBrand href="https://doh.wa.gov/" target="_blank">
      <Row>
        <Col>
          <Image id="nav-image" alt="Washington State Department of Health Logo" src="/img/doh_logo_doh-black.png"/>
        </Col>
      </Row>
    </NavbarBrand>
    <NavbarToggler class="me-2" on:click={() => ($isOpen = !$isOpen)} />
    <Collapse class="flex-column ms-2" isOpen={$isOpen} navbar expand="sm" on:update={handleUpdate}>
        <Nav class="ms-auto" navbar>
          <LanguageMenu />
        </Nav>
        <Nav class="ms-auto" navbar>
          <NavItem>
            <NavLink href={"/"} active={ activeItem === "home" }>Home</NavLink>
          </NavItem>
          {#if haveUser}
            {#await authService.getProfile() then profile}
              {#if profile}
                <NavItem>
                  <NavLink href="/summaries" active={ activeItem === "summaries" }>Summaries</NavLink>
                </NavItem>
                <NavItem>
                  <NavLink href="/create" active={ activeItem === "create" }>Create</NavLink>
                </NavItem>
                <Dropdown nav inNavbar class="navbar-dropdown" size="sm" direction="down">
                  <DropdownToggle color="primary" nav caret><Icon name="person-circle"/> Account</DropdownToggle>
                  <DropdownMenu end style="max-height: 500px; overflow:auto">
                    <DropdownItem header>Welcome, {profile.given_name ?? profile.preferred_username}</DropdownItem>
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
                            Show Advanced Features
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
                      <DropdownItem divider />
                      <DropdownItem header>Your Summaries</DropdownItem>
                      <DropdownItem on:click={() => { goto("/create") }}>
                        <Icon name="plus-lg" /> Create New Summary
                      </DropdownItem>
                      {#if $shlStore.length > 0}
                        {#each $shlStore as shl, i}
                          <DropdownItem
                            on:click={() => {
                            goto('/view/' + shl.id);
                          }}>{shl.label || `Summary ${i + 1}`}</DropdownItem>
                        {/each}
                      {/if}
                    </DropdownMenu>
                </Dropdown>
              {:else}
                <NavItem>
                  <NavLink on:click={() => authService.login()}><Icon name="person-circle"/> Sign In</NavLink>
                </NavItem>
              {/if}
            {/await}
          {:else}
          <NavItem>
            <NavLink on:click={() => authService.login()}><Icon name="person-circle"/> Sign In</NavLink>
          </NavItem>
        {/if}
        </Nav>
    </Collapse>
  </Navbar>
  <Banner title="Using the International Patient Summary"/>
</Row>
<style>
    :global(#nav-image) {
    width: 240px;
    -webkit-transition: all 0.06s linear;
    -moz-transition: all 0.06s linear;
    -o-transition: all 0.06s linear;
    transition: all 0.06s linear;
  }
  :global(.nav-text) {
    font-size:medium;
    -webkit-transition: all 0.06s linear;
    -moz-transition: all 0.06s linear;
    -o-transition: all 0.06s linear;
    transition: all 0.06s linear;
  }
  :global(.nav-link.scrolling) {
    padding-top: 0rem !important;
    padding-bottom: 0.25rem !important;
  }
  :global(#nav-image.scrolling) {
    width: 160px !important;
    margin-left: 10px;
  }
  :global(.nav-text.scrolling)  {
    font-size: xx-small;
    color: #000; /* Fallback for older browsers */
    color: rgba(0, 0, 0, 0.0);
  }
  :global(.navbar.scrolling) {
    padding: 0px !important;
  }
  :global(.nav-link) {
    position: relative;
  }
  /* using ::before because of dropdown arrow ::after pseudo element */
  :global(.nav-link::before) {
    content: '';
    opacity: 0;
    transition: all 0.2s;
    height: 2px;
    width: calc(100% - 2*var(--bs-navbar-nav-link-padding-x));
    left: var(--bs-navbar-nav-link-padding-x);
    background-color: lightgrey;
    position: absolute;
    bottom: 1px;
    /* left: 0; */
  }
  :global(.nav-link:hover::before) {
    opacity: 1;
  }
  :global(.nav-link.active::before) {
    opacity: 1;
    background-color: grey;
  }
</style>
