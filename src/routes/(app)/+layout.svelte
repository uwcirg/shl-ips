<script lang="ts">
  import { goto } from '$app/navigation';
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
    let newUser: User | undefined;
    try {
      newUser = await authService.signinCallback();
    } catch (error) {
      console.warn("No authentication parameters found, checking for current user");
    } finally {
      currentUser = authService.getUser().then((user) => {
        if (user) {
          let now = Date.now() / 1000;
          if ((user.expires_at ?? 0) < now) {
            return user ?? undefined;
          }
        }
        if (!user) {
          return authService.login().then(() => {
            return authService.getUser().then((user) => user ?? undefined);
          });
        } else {
          if (newUser) {
            let redirectUrl = authService.getRedirectUrl();
            if (redirectUrl) {
              goto(redirectUrl);
            } else {
              goto('/home');
            }
          }
        }
      });
      currentUser.then(async (user) => {
        $shlStore = await shlClient.getUserShls();
        return user;
      });
    }
  });

</script>
{#await currentUser}
  Authorizing...
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
      Authorizing...
    {/if}
  {/await}
{/await}
