<script lang="ts">
  import { getContext, setContext, onMount } from 'svelte';
  import { writable, type Writable, type Readable } from 'svelte/store';
  import {
    Col,
    Row
  } from '@sveltestrap/sveltestrap';
  import type { IAuthService } from '$lib/utils/types';
  import { type User } from 'oidc-client-ts';
  import type { SHLAdminParams } from '$lib/utils/types';
  import { type SHLClient } from '$lib/utils/managementClient';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import type { LayoutData } from './$types';
  import { invalidateAll } from '$app/navigation';
  import { buildColorMap } from '$lib/utils/colors';
  import { getFriendlySourceNames } from '$lib/utils/resourceCollectionUtils';

  export let data: LayoutData;

  let authService: IAuthService = getContext('authService');
  let user: Readable<User | null> = authService.user;

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let userResources = fhirDataService.userResources;

  const colorMap = writable<Map<string, string>>(new Map());
  setContext('colorMap', colorMap);
  $: if ($userResources) {
    let collectionInfo = fhirDataService.getAllResourceCollections().map(c => c.getTags());
    let friendlySourceNames = getFriendlySourceNames(collectionInfo);
    $colorMap = buildColorMap(friendlySourceNames);
  }

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
    await authService.isAuthenticated();
    user = authService.user;
    if ($user) {
      if (data.unauthenticated) {
        // User is valid but cookie was missing/invalid — sync current token.
        // No renewal happens here, so AuthService's own event-driven sync
        // (see addUserLoaded) never fires; sync explicitly.
        const token = await authService.getAccessToken();
        if (token) {
          const synced = await authService.syncTokenToServer(token);
          if (synced) {
            await invalidateAll();
            return;
          }
        }
        // Couldn't recover a usable token/cookie — force a fresh login
        // rather than leaving the page stuck on data.unauthenticated.
        await authService.login();
        return;
      }
      let now = Date.now() / 1000;
      if (($user.expires_at ?? 0) < now) {
        await authService.renewToken();
        await invalidateAll();
      }
    } else {
      await authService.login();
    }
  }

  onMount(async () => {
    await checkUser();
    if (!data.unauthenticated) {
      await fhirDataService.loadUserData();
      $shlStore = await shlClient.getUserShls();
    }
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
