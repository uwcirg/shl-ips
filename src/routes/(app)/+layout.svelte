<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { type Writable } from 'svelte/store';
  import {
    Col,
    Row
  } from 'sveltestrap';
  import type { IAuthService } from '$lib/utils/types';
  import { User } from 'oidc-client-ts';
  import { type SHLAdminParams, type SHLClient } from '$lib/utils/managementClient';

  let authService: IAuthService = getContext('authService');
  let user = authService.user;

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  let shlClient: SHLClient = getContext('shlClient');

  $: {
    if ($user) {
      $shlStore = shlClient.getUserShls();
    }
  }
</script>
{#if $user}
  <Row class="main-row">
    <Col>
      <slot />
    </Col>
  </Row>
{:else}
  <!-- TODO: Replace with loader animation -->
  Loading...
{/if}

<style>
  .main-row {
    flex-grow: 1;
  }
</style>