<script lang="ts">
  import {
    Alert,
    Col,
    Collapse,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Icon,
    Nav,
    NavItem,
    NavLink,
    Navbar,
    NavbarBrand,
    NavbarToggler,
    Row
  } from '@sveltestrap/sveltestrap';
  import { onMount, onDestroy, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { get, type Writable } from 'svelte/store';
  import LanguageMenu from '$lib/components/layout/LanguageMenu.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import { DEMO_WARNING, VERSION_STRING } from '$lib/config/config';
  import type { IAuthService, SHLAdminParams } from '$lib/utils/types';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import { imagePreload } from '$lib/utils/preloadImages';

  let authService: IAuthService = getContext('authService');
  let authenticated = authService.authenticated;
  let user = authService.user;

  let fhirDataService: FHIRDataService = getContext('fhirDataService');

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  
  let isOpen: Writable<boolean> = getContext('isOpen');

  let mode: Writable<string> = getContext('mode');

  let activeItem: string = "";
  $: {
    activeItem = "";
    for (const name of [...Object.keys(INSTANCE_CONFIG.pages), 'account']) {
      if ($page.url.pathname.includes(name)) {
        activeItem = name;
      } else if ($page.url.pathname == "/") {
        activeItem = "home";
      }
    }
  }

  onMount(async () => {
    $isOpen = false;
    addDynamicNavbarListeners();
  });
  onDestroy(() => {
    removeDynamicNavbarListeners();
  });

  function closeNav() {
    $isOpen = false;
  }

  function shrinkNav() {
    let links = document.getElementsByClassName("header-link");
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
    let links = document.getElementsByClassName("header-link");
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
    document.addEventListener('click', (event) => {
      // Ignore clicks on the navbar toggler
      if (event.target?.className?.includes('navbar-toggler')) return;
      // Ignore clicks on the dropdown toggle menu items
      if (event.target?.closest('.nav-link.header-link') && event.target?.closest('.dropdown-toggle')) {
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

  // Combine header, qr code, and footer images into one image
  async function createHeaderImage() {
    // create the qr code image

    // load the images
    const [companyLogo, divider, siteLogo] = await imagePreload as HTMLImageElement[];

    // scale the images to match the largest image width
    const targetHeight: number = Math.max(companyLogo.height, divider.height, siteLogo.height);
    const dividerWidth: number = (divider.width / divider.height) * targetHeight;
    const companyLogoImageWidth: number = (companyLogo.width / companyLogo.height) * targetHeight;
    const siteLogoWidth: number = (siteLogo.width / siteLogo.height) * targetHeight;

    // get the canvas and combine the images
    const canvas = document.getElementById('header-image') as HTMLCanvasElement;
    if (!canvas) {
      throw Error('Could not get header image canvas element');
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw Error('Could not get canvas context');
    }
    const marginX = targetHeight * 0.2;
    const marginY = targetHeight * 0.03;
    canvas.height = targetHeight + marginY * 2;
    canvas.width = dividerWidth + companyLogoImageWidth + siteLogoWidth + marginX * 4;
    ctx.fillStyle = "rgb(248, 249, 250)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(companyLogo, marginX, marginY,                                    companyLogoImageWidth, targetHeight);
    ctx.drawImage(divider, companyLogoImageWidth + marginX * 2, marginY,                     dividerWidth, targetHeight);
    ctx.drawImage(siteLogo, companyLogoImageWidth + dividerWidth + marginX * 3, marginY, siteLogoWidth, targetHeight);

    const fullImageDataUrl = canvas.toDataURL('image/png');
    return fullImageDataUrl;
  }

  function handleUpdate(event: any) {
    $isOpen = event.detail.isOpen;
  }
</script>

<canvas id="header-image" class="img-fluid" style="display: none;"/>

<Row>
  <Navbar sticky="top" color="light" light expand="md" style="border-bottom: 1px solid rgb(204, 204, 204);">
    <div class="container-fluid d-flex align-items-center justify-content-between">
      {#await createHeaderImage()}
      <!-- <NavbarBrand class="flex-shrink-1"> <img id="nav-image" src={`${INSTANCE_CONFIG.imgPath}/company-logo.png`} alt="Site Logo" style="width: fit-content; height: 60px;" /> </NavbarBrand> -->
      {:then headerImageUrl}
      <!-- <NavbarBrand class="flex-shrink-1"> <img id="nav-image" style="height: 60px;"/> </NavbarBrand> -->
      <NavbarBrand class="flex-shrink-1">
        <img id="nav-image" alt="Washington State Department of Health Logo" src={headerImageUrl}/>
      </NavbarBrand>
      {/await}
      <div class="flex-grow-1 d-flex align-items-center justify-content-end">
        <NavbarToggler class="me-2" on:click={() => ($isOpen = !$isOpen)} />
      </div>
    </div>
    <Collapse class="flex-column ms-2" isOpen={$isOpen} navbar expand="md" on:update={handleUpdate}>
      <Nav class="ms-auto" navbar>
        <LanguageMenu />
      </Nav>
      <Nav class="ms-auto" navbar>
        <NavItem>
          <NavLink class="header-link" style="text-wrap-mode: nowrap" href={"/"} active={ activeItem === "home" }>Home</NavLink>
        </NavItem>
        {#if $authenticated}
          {#if $user}
            <NavItem>
              <NavLink class="header-link" style="text-wrap-mode: nowrap" href="/data" active={ activeItem === "data" }>My Data</NavLink>
            </NavItem>
            {#if INSTANCE_CONFIG.pages.summaries}
              <NavItem>
                <NavLink class="header-link" style="text-wrap-mode: nowrap" href="/summaries" active={ activeItem === "summaries" }>My Summaries</NavLink>
              </NavItem>
            {/if}
            {#if INSTANCE_CONFIG.pages.documents}
              <NavItem>
                <NavLink class="header-link" style="text-wrap-mode: nowrap" href="/documents" active={ activeItem === "documents" }>Documents</NavLink>
              </NavItem>
            {/if}
            {#if INSTANCE_CONFIG.pages.provider}
              <NavItem>
                <NavLink class="header-link" style="text-wrap-mode: nowrap" href="/provider" active={ activeItem === "provider" }>Provider</NavLink>
              </NavItem>
            {/if}
            <Dropdown nav inNavbar class="navbar-dropdown" size="sm" direction="down">
              <DropdownToggle color="primary" nav caret class={`header-link ${activeItem === "account" ? "active" : "" }`}>
                <Icon name="person-circle"/> Account
              </DropdownToggle>
              <DropdownMenu end style="max-height: 350px; overflow:auto">
                <DropdownItem header>
                  Welcome, {get(fhirDataService.demographics)?.firstName ?? $user.profile.given_name ?? $user.profile.preferred_username} ({$user.profile.email})
                  {#if $user.profile.idp === 'google'}
                    <br><Icon name="google" alt="Google logo" aria-label="Signed in using Google"/> Signed in using Google
                  {/if}
                </DropdownItem>
                <DropdownItem on:click={() => {
                  goto('/account');
                }}><Icon name="gear-fill"/> Settings</DropdownItem>
                <DropdownItem
                  on:click={() => {
                    authService.logout();
                  }}><Icon name="box-arrow-right"/> Sign Out</DropdownItem>
                  {#if INSTANCE_CONFIG.advanced}
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
                  {/if}
                  <DropdownItem divider />
                  <DropdownItem header>Build: {VERSION_STRING.split('-g')[0]}</DropdownItem>
                </DropdownMenu>
            </Dropdown>
          {:else}
            <NavItem>
              <NavLink class="header-link" on:click={() => authService.login()} style="text-wrap-mode: nowrap"><Icon name="person-circle"/> Sign In</NavLink>
            </NavItem>
          {/if}
        {:else}
        <NavItem>
          <NavLink class="header-link" on:click={() => authService.login()} style="text-wrap-mode: nowrap"><Icon name="person-circle"/> Sign In</NavLink>
        </NavItem>
      {/if}
      </Nav>
    </Collapse>
  </Navbar>
</Row>
{#if DEMO_WARNING}
  <Alert color="warning" dismissible class="mt-2 mb-0">
    <span class="text-danger">Demonstration/test system - do not use with real health information</span>
  </Alert>
{/if}
<!-- <Banner title={INSTANCE_CONFIG.header.title} style={INSTANCE_CONFIG.header.title_style}/> -->

<style>
  :global(#nav-image) {
    height: auto;
    width: 100%;
    max-width: 440px;
    min-width: 220px;
    object-fit: contain;
    -webkit-transition: all 0.06s linear;
    -moz-transition: all 0.06s linear;
    -o-transition: all 0.06s linear;
    transition: all 0.06s linear;
  }
  :global(.navbar-brand) {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    overflow: hidden;
    min-width: 220px;
    /* margin: 0 !important;
    padding: 0 !important; */
  }
  :global(.nav-text) {
    font-size:medium;
    -webkit-transition: all 0.06s linear;
    -moz-transition: all 0.06s linear;
    -o-transition: all 0.06s linear;
    transition: all 0.06s linear;
  }
  div > :global(.nav-link.header-link.scrolling) {
    padding-top: 0rem !important;
    padding-bottom: 0.25rem !important;
  }
  :global(#nav-image.scrolling) {
    max-width: 293px !important;
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
  :global(.nav-link.header-link) {
    position: relative;
    max-width: fit-content;
  }
  /* using ::before because of nav dropdown arrow ::after pseudo element */
  :global(.nav-link.header-link::before) {
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
  :global(.nav-link.header-link:hover::before) {
    opacity: 1;
  }
  :global(.nav-link.header-link.active::before) {
    opacity: 1;
    background-color: grey;
  }
  @media (max-width: 768px) {
    :global(.nav-link.header-link::before) {
      width: 100% !important;
      left: 0 !important;
    }
  }
</style>
