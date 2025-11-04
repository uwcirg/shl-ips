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
  import FHIRDataService from '$lib/utils/FHIRDataService';

  let authService: IAuthService = getContext('authService');
  let user: User = authService.user;

  let fhirDataService: FHIRDataService = getContext('fhirDataService');

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  let shlClient: SHLClient = getContext('shlClient');

  $: {
    (async () => {
      if ($user) {
        $shlStore = await shlClient.getUserShls();
      }
    })();
  }

  async function checkUser() {
    user = authService.user;
    if ($user) {
      let now = Date.now() / 1000;
      if (($user.expires_at ?? 0) < now) {
        await authService.renewToken();
      }
    } else {
      await authService.renewToken();
    }
  }

  onMount(async () => {
    await checkUser();
    await fhirDataService.loadUserData();
    await shlClient.getUserShls();
  });

</script>
{#if $user}
  <Row class="flex-fill">
    <Col class = "d-flex flex-column">
      <slot />
    </Col>
  </Row>
{:else}
  <!-- TODO: Replace with loader animation -->
  Loading...
{/if}

<style>
  .main-row {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
</style>