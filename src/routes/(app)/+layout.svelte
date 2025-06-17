<script lang="ts">
  import { goto } from '$app/navigation';
  import { getContext, onMount, setContext } from 'svelte';
  import { type Writable } from 'svelte/store';
  import {
    Col,
    Row
  } from 'sveltestrap';
  import { page } from '$app/stores';
  import { AuthService } from '$lib/utils/AuthService';
  import { User } from 'oidc-client-ts';
  import { type SHLAdminParams, type SHLClient } from '$lib/utils/managementClient';

  let authService = AuthService.Instance;

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  let shlClient: SHLClient = getContext('shlClient');

  let currentUser: Promise<User | undefined>;
  
  onMount(async () => {
    currentUser = authService.getUser().then((user) => {
      if (!user) {
        return authService.login().then(() => {
          return authService.getUser().then((user) => user ?? undefined);
        });
      }
      return user;
    });
    currentUser.then(async (user) => {
      window.dispatchEvent(new CustomEvent('userFound', { 
        detail: { message: 'Hello from another component!' } 
      }));
      $shlStore = await shlClient.getUserShls();
      return user;
    });
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
