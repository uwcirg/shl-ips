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

  async function syncTokenToServer(token: string): Promise<boolean> {
    const response = await fetch('/auth/settoken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    return response.ok;
  }

  async function checkUser() {
    await authService.isAuthenticated();
    user = authService.user;
    if ($user) {
      if (data.unauthenticated) {
        // User is valid but cookie was missing/invalid — sync current token
        const token = await authService.getAccessToken();
        if (token) {
          await syncTokenToServer(token);
          await invalidateAll();
        }
        return;
      }
      let now = Date.now() / 1000;
      if (($user.expires_at ?? 0) < now) {
        const renewedUser = await authService.renewToken();
        if (renewedUser?.access_token) {
          const synced = await syncTokenToServer(renewedUser.access_token);
          if (synced) {
            await invalidateAll(); // now safe — cookie is confirmed set on server
          } else {
            await authService.login();
          }
        }
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
