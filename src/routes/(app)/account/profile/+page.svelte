<script lang="ts">
  import { getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { Button, Card, CardHeader, CardBody, Row, Col } from '@sveltestrap/sveltestrap';
  import Patient from '$lib/components/resource-templates/Patient.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import { AUTH_URL, AUTH_CLIENT_ID } from '$lib/config/config';
  import FHIRDataService from '$lib/utils/FHIRDataService';

  let authService: FHIRDataService = getContext('authService');
  let user = authService.user;
  let googleLogin: boolean;
  $: googleLogin = $user.profile.idp === 'google';

</script>


<svelte:head>
  <title>Account - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

<h4>Account Information</h4>
<p> Welcome, {$user.profile.name ?? $user.profile.given_name ?? $user.profile.preferred_username ?? $user.profile.email}</p>
<p> You are signed in as <strong>{$user.profile.email}</strong> using your {googleLogin ? 'Google' : INSTANCE_CONFIG.title} account.</p>
{#if !googleLogin}
<br>
<p> Click here to reset your password: <a href={`${AUTH_URL}/login-actions/reset-credentials?client_id=${AUTH_CLIENT_ID}`}>Reset Password</a></p>
{/if}
