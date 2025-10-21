<script lang="ts">
  import { Nav, NavLink, NavItem, Collapse, Row, Col } from 'sveltestrap';
  import { goto } from '$app/navigation';
  
  let tabs: Record<string, string> = {
    'profile': 'Profile',
    'patient': 'Patient Data'
  };

  let activeTab: string = window.location.pathname.split('/').pop() || '';
  $:{ 
    if (tabs[activeTab]) {
      goto(`/account/${activeTab}`);
    } else {
      activeTab = 'profile';
    }
  }

  function toggleTab(tabId: string) {
    activeTab = tabId;
  }

</script>

<h4>Account Settings</h4>
<div class="d-flex flex-column flex-lg-row tab-content data-tabs">
  <!-- Sidebar for medium and up -->
  <Nav pills vertical style="width:15em" class="flex-column d-none d-lg-flex me-3 p-2 bg-light rounded">
    <h6 class="py-2">Account Settings</h6>
    {#each Object.entries(tabs) as [tabId, tabName]}
      <NavItem>
        <NavLink active={activeTab === tabId} on:click={() => { toggleTab(tabId); goto(`/account/${tabId}`); }}>
          {tabName}
        </NavLink>
      </NavItem>
    {/each}
  </Nav>
  <div class="tab-pane active show w-100">
    <slot />
  </div>
</div>