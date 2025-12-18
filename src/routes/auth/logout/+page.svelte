<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert } from '@sveltestrap/sveltestrap';
  import { goto } from '$app/navigation';
  import { getContext } from 'svelte';
  import type { IAuthService } from '$lib/utils/types';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';

  let authService: IAuthService = getContext('authService');
  let errorMsg = "";

  onMount(() => {
      try {
          authService.logout();
      } catch (e) {
          console.error(e);
          errorMsg = "Unable to log out.";
          goto('/');
      }
  });
</script>

<svelte:head>
<title>Logout - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

{#if errorMsg}
<Alert color="danger">
  {errorMsg}
</Alert>
{/if}