<script lang="ts">
  import { NavItem, NavLink } from 'sveltestrap';
  export let active: boolean;
</script>

<NavItem>
  <NavLink href="/share" active={active}>Share</NavLink>
</NavItem>