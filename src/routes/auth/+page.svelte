<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import type { IAuthService } from '$lib/utils/types';
  import type { User } from 'oidc-client-ts';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';

  let authService: IAuthService = getContext('authService');

  onMount(async () => {
    let newUser: User | undefined;
    try {
      newUser = await authService.signinCallback();
      setTimeout(async () => {
        let redirectUrl = authService.getRedirectUrl();
        // avoid redirecting to the same page
        if (redirectUrl && !redirectUrl.includes($page.url.pathname)) {
          goto(redirectUrl);
        } else {
          goto(INSTANCE_CONFIG.defaultRedirectURI ?? '/');
        }
      }, 100);
    } catch (error) {
      console.error("No authentication parameters found.");
      console.error(error);
      authService.login();
    }
  });
</script>
<svelte:head>
    <title>Authenticate - WA Health Summary</title> 
</svelte:head>
