<script lang="ts">
  import { Nav, NavItem, NavLink } from '@sveltestrap/sveltestrap';
  export let activeItem: string;
  let className = '';
  export { className as class };

  $: classes = className || '';
</script>

<div class="border container-fluid d-flex align-items-center justify-content-center p-2 rounded-4 {classes}" style="background-color: white;">
  <Nav pills class="nav-justified w-100">
    <NavItem class="mx-1">
      <NavLink href="/data" active={ activeItem === "data" } class="d-flex justify-content-center rounded-5 text-nowrap">Add/Import</NavLink>
    </NavItem>
    <NavItem class="mx-1">
      <NavLink href="/data/manage" active={ activeItem === "manage" } class="d-flex justify-content-center rounded-5">Review</NavLink>
    </NavItem>
    <NavItem class="mx-1">
      <NavLink href="/summaries" active={ activeItem === "summaries" || activeItem === "share" } class="d-flex justify-content-center rounded-5">Share</NavLink>
    </NavItem>
  </Nav>
</div>
