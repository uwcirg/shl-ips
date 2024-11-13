<script lang="ts">
  import { getContext, onMount, setContext } from 'svelte';
  import { AuthService } from '$lib/utils/AuthService';
  import type { User } from 'oidc-client-ts';

  let authService = getContext('authService') as AuthService;

  let currentUser: User | null = null;
  
  onMount(async () => {
    if (!authService) {
      authService = new AuthService();
      setContext('authService', authService);
    }

    currentUser = await authService.getUser();
  });

</script>
