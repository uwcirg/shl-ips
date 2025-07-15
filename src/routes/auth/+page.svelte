<script lang="ts">
  import { onMount, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page, type Writable } from '$app/stores';
  import AuthService from '$lib/utils/AuthService';
  import type { User } from 'oidc-client-ts';
  import type { SHLAdminParams, SHLClient } from '$lib/utils/managementClient';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  let shlClient: SHLClient = getContext('shlClient');

  let authService = AuthService.Instance;
  onMount(async () => {
    let newUser: User | undefined;
    try {
      newUser = await authService.signinCallback();
      if (newUser) {
        setTimeout(async () => {
          window.dispatchEvent(new CustomEvent('userFound', { 
            detail: { message: 'Hello from the auth page component!' } 
          }));
          $shlStore = await shlClient.getUserShls();
          let redirectUrl = authService.getRedirectUrl();
          // avoid redirecting to the same page
          if (redirectUrl && !redirectUrl.includes($page.url.pathname)) {
            goto(redirectUrl);
          } else {
            goto(INSTANCE_CONFIG.defaultRedirectURI ?? '/summaries');
          }
        }, 100);
      }
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
