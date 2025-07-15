<script lang="ts">
  import { NavItem, NavLink } from 'sveltestrap';
  export let active: boolean;
</script>

<NavItem>
  <NavLink href="/create" active={active}>Create</NavLink>
</NavItem>