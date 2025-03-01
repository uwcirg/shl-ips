<script lang="ts">
  import { onMount } from 'svelte';
  import { Alert } from 'sveltestrap';
  import { goto } from '$app/navigation';
  import { AuthService } from '$lib/utils/AuthService';

  let authService = AuthService.Instance;
  let errorMsg = "";

  onMount(() => {
      try {
          authService.logout();
      } catch (e) {
          console.error(e);
          errorMsg = "Unable to log out.";
          goto('/summaries');
      }
  });
</script>

<svelte:head>
<title>Logout - WA Health Summary</title> 
</svelte:head>

{#if errorMsg}
<Alert color="danger">
  {errorMsg}
</Alert>
{/if}