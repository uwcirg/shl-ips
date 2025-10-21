<script lang="ts">
  import {
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Icon,
    Nav,
    NavLink,
    NavItem,
  } from 'sveltestrap';
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

  let tabNavOpen: boolean = false;
  function toggleTab(tabId: string) {
    activeTab = tabId;
  }

</script>

<div class="d-flex flex-column flex-lg-row tab-content data-tabs">
  <!-- Sidebar for large and up -->
  <Nav pills vertical style="width:15em" class="flex-column d-none d-lg-flex me-3 p-2 bg-light rounded">
    <h6 class="py-2">Account Settings</h6>
    {#each Object.entries(tabs) as [tabId, tabName]}
      <NavItem>
        <NavLink active={activeTab === tabId} on:click={() => { toggleTab(tabId) }}>
          {tabName}
        </NavLink>
      </NavItem>
    {/each}
  </Nav>
  <!-- Mobile navigation toggle -->
  <div class="d-lg-none mb-3">
    <Nav tabs>
      <NavItem>
        <Dropdown nav isOpen={tabNavOpen}>
          <DropdownToggle nav caret class="active">Account <Icon name="chevron-right" style="font-size: .7em"/> {tabs[activeTab]}</DropdownToggle>
          <DropdownMenu>
            {#each Object.entries(tabs) as [tabId, tabName]}
              <DropdownItem active={activeTab === tabId} on:click={() => toggleTab(tabId)}>
                  <span>{tabName}</span>
              </DropdownItem>
            {/each}
          </DropdownMenu>
        </Dropdown>
      </NavItem>
    </Nav>
  </div>
  <div class="tab-pane active show w-100">
    <slot />
  </div>
</div>