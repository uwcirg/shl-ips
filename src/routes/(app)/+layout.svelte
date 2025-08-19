<script lang="ts">
  import { getContext, onMount, setContext } from 'svelte';
  import { type Writable } from 'svelte/store';
  import {
    Col,
    Row
  } from 'sveltestrap';
  import { AuthService } from '$lib/utils/AuthService';
  import { User } from 'oidc-client-ts';
  import { type SHLAdminParams, type SHLClient } from '$lib/utils/managementClient';

  let authService = AuthService.Instance;

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  let shlClient: SHLClient = getContext('shlClient');

  let currentUser: Promise<User | undefined>;
  
  onMount(async () => {
    currentUser = await authService.getUser();
    if (!currentUser) {
      await authService.login();
      currentUser = await authService.getUser();
    }
    window.dispatchEvent(new CustomEvent('userFound', { 
      detail: { message: 'Hello from the app routes component!' } 
    }));
    $shlStore = await shlClient.getUserShls();
  });

</script>
{#await currentUser}
  Loading...
{:then}
  {#await authService.getProfile() then profile}
    {#if profile}
      <Row class="main-row">
        <Col>
          <slot />
        </Col>
      </Row>
    {:else}
      <!-- TODO: Replace with loader animation -->
      Loading...
    {/if}
  {/await}
{/await}

<style>
  .main-row {
    flex-grow: 1;
  }
</style>