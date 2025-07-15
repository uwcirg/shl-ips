<script lang="ts">
  import { NavItem, NavLink } from 'sveltestrap';
  export let active: boolean;
</script>

<NavItem>
  <NavLink href="/summaries" active={active}>Summaries</NavLink>
</NavItem>