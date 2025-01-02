<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { AuthService } from '$lib/utils/AuthService';
  import type { User } from 'oidc-client-ts';
  import { goto } from '$app/navigation';

  let authService: AuthService = AuthService.Instance;

  let currentUser: User | undefined;
  
  onMount(async () => {
    let newUser: User | undefined;
    try {
      newUser = await authService.signinCallback();
    } catch (error) {
      console.warn("No authentication parameters found, checking for current user");
    } finally {
      currentUser = await authService.getUser() ?? undefined;
      if (currentUser) {
        let now = Date.now() / 1000;
        if ((currentUser.expires_at ?? 0) < now) {
          currentUser = await authService.renewToken() ?? undefined;
        }
      }
      if (!currentUser) {
        await authService.login();
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
    }
  });

</script>
{#if currentUser}
  <slot />
{:else}
  Authorizing...
{/if}
