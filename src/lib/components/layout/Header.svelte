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
  import { onMount, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { type Writable } from 'svelte/store';
  import Banner from '$lib/components/layout/Banner.svelte';
  import LanguageMenu from '$lib/components/layout/LanguageMenu.svelte';
  import { User } from 'oidc-client-ts';
  import { AuthService } from '$lib/utils/AuthService';
  import { type SHLAdminParams, type SHLClient } from '$lib/utils/managementClient';

  let authService = AuthService.Instance;

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');

  let shlClient: SHLClient = getContext('shlClient');
  
  let isOpen: Writable<boolean> = getContext('isOpen');

  let mode: Writable<string> = getContext('mode');

  let currentUser: Promise<User | undefined>;

  onMount(async () => {
    window.onscroll = function() {scrollFunction()};
    scrollFunction();
    $isOpen = false;

    try {
      currentUser = await authService.signinCallback();
    } catch (error) {
      console.warn("No authentication parameters found, checking for current user");
    } finally {
      currentUser = authService.getUser().then(async (user) => {
        if (user) {
          $shlStore = await shlClient.getUserShls();
        }
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

  function closeNav() {
    $isOpen = false;
  }

  let navOpening = false;
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

  window.addEventListener('scroll', (event) => {
    if (document.querySelector('.navbar-dropdown.show')?.matches(':hover')) return;
    if (document.getElementsByClassName('navbar-collapse collapsing')?.length > 0) return;
    if (navOpening) return;
    closeNav();
  });

  function handleUpdate(event: any) {
    $isOpen = event.detail.isOpen;
  }
</script>

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
          <NavLink href={"/"}>Home</NavLink>
        </NavItem>
        {#await authService.getProfile() then profile}
          {#if profile}
            <NavItem>
              <NavLink href="/home">My Summaries</NavLink>
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
      </Nav>
  </Collapse>
</Navbar>
<Banner title="International Patient Summary Prototype"/>
