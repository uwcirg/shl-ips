<script lang="ts">
  import { NavItem, NavLink } from '@sveltestrap/sveltestrap';
  export let active: boolean;
</script>

<NavItem style="border-left: 1px solid rgb(204, 204, 204);">
  <NavLink href="/provider" active={active}>Provider</NavLink>
</NavItem>