<script lang="ts">
  import { Icon, Nav, NavItem, NavLink } from '@sveltestrap/sveltestrap';
  export let activeItem: string;
  let className = '';
  export { className as class };

  $: classes = className || '';
</script>

<div class="border container-fluid d-flex align-items-center justify-content-center p-2 rounded-4 {classes}" style="background-color: white;">
  <Nav pills class="nav-justified w-100">
    <NavItem class="mx-1 flex-grow-0" style="width: min-content !important">
      <NavLink href="/home" active={activeItem === "home"} class="d-flex align-items-center justify-content-center rounded-5 px-3 py-0" style="line-height: 1; height: 100%">
        <Icon class="fs-4" name="house"/>
      </NavLink>
    </NavItem>
    <NavItem class="mx-1">
      <NavLink href="/data" active={activeItem === "data"} class="d-flex flex-column flex-sm-row justify-content-center align-items-center rounded-5 text-nowrap gap-1">
        <Icon class="d-sm-none fs-6" name="building-add"/>
        <span class="d-none d-sm-inline">Add/Import</span>
        <small class="d-sm-none" style="font-size: 0.6rem; line-height: 1.2">Add Data</small>
      </NavLink>
    </NavItem>
    <NavItem class="mx-1">
      <NavLink href="/data/manage" active={activeItem === "manage"} class="d-flex flex-column flex-sm-row justify-content-center align-items-center rounded-5 gap-1">
        <Icon class="d-sm-none fs-6" name="clipboard-check"/>
        <span class="d-none d-sm-inline">Review</span>
        <small class="d-sm-none" style="font-size: 0.6rem; line-height: 1.2">Review</small>
      </NavLink>
    </NavItem>
    <NavItem class="mx-1">
      <NavLink href="/summaries" active={activeItem === "summaries" || activeItem === "share"} class="d-flex flex-column flex-sm-row justify-content-center align-items-center rounded-5 gap-1">
        <Icon class="d-sm-none fs-6" name="share"/>
        <span class="d-none d-sm-inline">Share</span>
        <small class="d-sm-none" style="font-size: 0.6rem; line-height: 1.2">Share</small>
      </NavLink>
    </NavItem>
  </Nav>
</div>
