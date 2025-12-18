<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import type { IAuthService } from '$lib/utils/types';

  let authService: IAuthService = getContext('authService');

  onMount(() => {
    // Complete the silent sign-in process
    authService.signinCallback().catch((err) => {
      console.error("Silent renew error:", err);
    });
  })
</script>