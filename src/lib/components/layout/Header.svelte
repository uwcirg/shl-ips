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
    Navbar,
    NavbarBrand,
    NavbarToggler,
    NavLink,
    NavItem,
    Row
  } from 'sveltestrap';
  import { getContext, onMount, setContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { writable, type Writable } from 'svelte/store';
  import { NavLinks } from '$lib/utils/types';
  import LanguageMenu from '$lib/components/layout/LanguageMenu.svelte';
  import type { SHLAdminParams } from '$lib/utils/managementClient';

  export let content: NavLinks[] = [];

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');

  let mode: Writable<string> = getContext('mode');

  let isOpen = false;

  function closeNav() {
    isOpen = false;
  }

  let checkingClick = false;
  document.addEventListener('click', (event) => {
    checkingClick = true;
    let cn = event.target?.className;
    let isNavToggler = cn?.indexOf('navbar-toggler') !== -1;
    let isNavDropdown = cn?.indexOf('dropdown-toggle nav-link') !== -1;
    if (!isNavToggler && !isNavDropdown) {
      closeNav();
    }
    setTimeout(() => checkingClick = false, 500);
  });
  document.addEventListener('keydown', (event) => {
    closeNav();
  });
  window.addEventListener('scroll', (event) => {
    if (checkingClick) return;
    closeNav();
  });

  onMount(() => {
    window.onscroll = function() {scrollFunction()};
    scrollFunction();
    closeNav();
  });

  function scrollFunction() {
    if (window.scrollY > 40) {
      document.getElementById("nav-image")?.classList.add("scrolling");
      document.getElementsByClassName("navbar")[0].classList.add("scrolling");
      let es = document.getElementsByClassName("nav-text");
      for(let i = 0; i < es.length; i++) {
        es[i].classList.add("scrolling");
      }
    } else if (window.scrollY == 0) {
      document.getElementById("nav-image")?.classList.remove("scrolling");
      document.getElementsByClassName("navbar")[0].classList.remove("scrolling");
      let es = document.getElementsByClassName("nav-text");
      for(let i = 0; i < es.length; i++) {
        es[i].classList.remove("scrolling");
      }
    }
  }

  function handleUpdate(event:any) {
    isOpen = event.detail.isOpen;
  }
</script>

<Navbar class="sticky-top" color="light" light expand="md" style="border-bottom: 1px solid rgb(204, 204, 204);">
  <NavbarBrand href="https://doh.wa.gov/" target="_blank">
    <Row>
      <Col>
        <Image id="nav-image" alt="Washington State Department of Health Logo" src="/img/doh_logo_doh-black.png"/>
      </Col>
      <Col style="vertical-align:middle" class="d-none d-sm-block align-items-center">
        <div class="nav-text mt-2">
          <span>Washington State</span>
          <p style="margin: 10px; padding: 0px: line-height: 0;"></p>
          <span>Department of Health</span>
        </div>
      </Col>
    </Row>
  </NavbarBrand>
  <NavbarToggler on:click={() => (isOpen = !isOpen)} />
  <Collapse isOpen={isOpen} navbar expand="md" on:update={handleUpdate}>
    <Nav class="ms-auto" navbar>
      {#if content.includes(NavLinks.Home)}
        <NavItem>
          <NavLink href="/home">Home</NavLink>
        </NavItem>
      {/if}
      {#if content.includes(NavLinks.Actions)}
        <Dropdown nav inNavbar size="sm" direction="down">
          <DropdownToggle color="primary" nav caret>Actions</DropdownToggle>
          <DropdownMenu end style="max-height: 500px; overflow:auto">
            <DropdownItem
              on:click={() => {
                goto("/create");
              }}>Add New SHLink</DropdownItem>
            <DropdownItem
              on:click={() => {
                $shlStore = [];
                goto('/');
              }}>Reset Demo</DropdownItem>
              <DropdownItem divider />
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
            {#if $shlStore.length > 0}
              <DropdownItem divider />
              <DropdownItem header>View Stored SHLinks</DropdownItem>
              {#each $shlStore as shl, i}
                <DropdownItem
                  on:click={() => {
                  goto('/view/' + shl.id);
                }}>{shl.label || `SHLink ${i + 1}`}</DropdownItem>
              {/each}
            {/if}
          </DropdownMenu>
        </Dropdown>
      {/if}
      {#if content.includes(NavLinks.Languages)}
        <LanguageMenu />
      {/if}
    </Nav>
  </Collapse>
</Navbar>

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

</style>