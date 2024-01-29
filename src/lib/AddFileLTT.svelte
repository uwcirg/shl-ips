<script lang="ts">
    import * as jose from 'jose';
    import * as pako from 'pako';
    import { createEventDispatcher, onMount } from 'svelte';
    import FetchSoFLTT from './FetchSoFLTT.svelte';
    import ResourceSelectorLTT from './ResourceSelectorLTT.svelte';
    import { verify } from './shc-decoder.js';

    import issuerKeys from './issuer.private.jwks.json';
    import type { SHCFile,
      Bundle,
      SHCRetrieveEvent,
      ResourceRetrieveEvent,
      IPSRetrieveEvent,
      SHLSubmitEvent, 
      SOFAuthEvent} from './types';
    import { page } from '$app/stores';
    import { getResourcesFromIPS } from './resourceUploader.js';
    import { goto } from '$app/navigation';
    
    let shlIdParam = $page.url.searchParams.get('shlid');
    let tabParam = $page.url.searchParams.get('tab');

    const shlDispatch = createEventDispatcher<{ 'shl-submitted': SHLSubmitEvent }>();
    let submitting = false;
    let fetchError = "";
    let currentTab: string | number;
    currentTab = tabParam ?? 'url';


    let resourceResult: ResourceRetrieveEvent = {
      resources: undefined
    }
    let shcResult: SHCRetrieveEvent = {
      shc: undefined
    }
    let ipsResult: IPSRetrieveEvent = {
      ips: undefined
    }

    let resourcesToReview: any[] = [];
    let shcsToAdd: SHCFile[] = [];
    let singleIPS = true;

    let label = 'SHL from ' + new Date().toISOString().slice(0, 10);
    let expiration: number | null = -1;
    let type = 'password';
    let showPassword = false;
    let passcode = "";
    $: type = showPassword ? 'text' : 'password';
    $: icon = showPassword ? 'eye-slash-fill' : 'eye-fill';

    onMount(() => {
      if (sessionStorage.getItem('URL')) {
        let url = sessionStorage.getItem('URL') ?? '/create';
        sessionStorage.removeItem('URL');
        return goto(url);
      }
      currentTab = sessionStorage.getItem('TAB') ?? currentTab;
      label = sessionStorage.getItem('LABEL') ?? label;
      passcode = sessionStorage.getItem('PASSCODE') ?? passcode;
      if (sessionStorage.getItem('RESOURCES')) {
        resourcesToReview = JSON.parse(sessionStorage.getItem('RESOURCES') ?? "") ?? resourcesToReview;
      }
      if (sessionStorage.getItem('EXPIRE')) {
        expiration = JSON.parse(sessionStorage.getItem('EXPIRE') ?? "-1");
      }
      sessionStorage.removeItem('RESOURCES');
      sessionStorage.removeItem('TAB');
      sessionStorage.removeItem('LABEL');
      sessionStorage.removeItem('PASSCODE');
      sessionStorage.removeItem('EXPIRE');
    });

    async function handleNewResources(details: ResourceRetrieveEvent) {
        try {
          resourceResult = details;
          if (resourceResult.resources) {
            // Trigger update in ResourceSelectorLTT
            resourcesToReview = resourceResult.resources;
          }
        } catch (e) {
          console.log('Failed', e);
          fetchError = "Error preparing IPS";
        }
    }

    async function handleSHCResultUpdate(details: SHCRetrieveEvent) {
        try {
          shcResult = details;
          if (shcResult.shc && isSHCFile(shcResult.shc)) {
            const decoded = await verify(shcResult.shc.verifiableCredential[0]);
            const data = decoded.fhirBundle;
            stageRetrievedIPS({ips: data, source: shcResult.source});
          } else {
            throw Error("Empty or invalid smart health card");
          }

        } catch (e) {
          console.log('Failed', e);
          fetchError = "Error processing health card";
        }
    }

    async function uploadRetrievedIPS(details: IPSRetrieveEvent) {
      try {
        submitting = true;
        ipsResult = details;
        if (ipsResult.ips) {
          shcsToAdd.unshift(await packageSHC(ipsResult.ips));
          submitSHL();
        }
      } catch (e) {
        submitting = false;
        console.log('Failed', e);
        fetchError = "Error submitting IPS";
      }
    }

    async function stageRetrievedIPS(details: IPSRetrieveEvent) {
      try {
        if (singleIPS && ipsResult.ips) {
          singleIPS = false;
        }
        ipsResult = details;
        if (!ipsResult.ips) {
          throw Error("Empty IPS content: " + JSON.stringify(details));
        }

        let ipsResources = getResourcesFromIPS(ipsResult.ips);
        handleNewResources({ resources: ipsResources });
      } catch (e) {
        console.log('Failed', e);
        fetchError = "Error parsing IPS";
      }
    }

    async function preAuthRedirectHandler(details: SOFAuthEvent|undefined) {
      sessionStorage.setItem('URL', window.location.href);
      sessionStorage.setItem('RESOURCES', JSON.stringify(resourcesToReview ?? ""));
      sessionStorage.setItem('TAB', String(currentTab ?? ""));
      sessionStorage.setItem('LABEL', label ?? "");
      sessionStorage.setItem('PASSCODE', passcode ?? "");
      sessionStorage.setItem('EXPIRE', JSON.stringify(expiration ?? -1));
    }
    
    function isSHCFile(object: any): object is SHCFile {
      return 'verifiableCredential' in object;
    }

    async function packageSHC(content:SHCFile | Bundle | undefined): Promise<SHCFile> {
        if (content != undefined && isSHCFile(content) && content.verifiableCredential) {
          return content;
        }

        const shc = await signJws(content);

        return { verifiableCredential: [shc] };
    }

    async function submitSHL() {
      return shlDispatch('shl-submitted', {
        shcs: shcsToAdd,
        label,
        passcode: passcode ?? undefined,
        exp: expiration && expiration > 0 ? new Date().getTime() / 1000 + expiration : undefined
      });
    }

    const exampleSigningKey = jose.importJWK(issuerKeys.keys[0]);
    async function signJws(payload: unknown) {
        const fields = { zip: 'DEF', alg: 'ES256', kid: issuerKeys.keys[0].kid };
        const body = pako.deflateRaw(
            JSON.stringify({
                iss: 'https://spec.smarthealth.cards/examples/issuer',
                nbf: new Date().getTime() / 1000,
                vc: {
                    type: ['https://smarthealth.cards#health-card'],
                    credentialSubject: {
                        fhirVersion: '4.0.1',
                        fhirBundle: payload
                    }
                }
            })
        );

        const signed = new jose.CompactSign(body)
        .setProtectedHeader(fields)
        .sign(await exampleSigningKey);
        return signed;
    }
</script>

<FetchSoFLTT
  on:sofAuthEvent={ async ({ detail }) => { preAuthRedirectHandler(detail) } }
  on:updateResources={ async ({ detail }) => { handleNewResources(detail) } }
  on:shc-retrieved={ async ({ detail }) => { handleSHCResultUpdate(detail) } }>
</FetchSoFLTT>

{#if resourcesToReview.length > 0}
  <span class="text-danger">{fetchError}</span>
  <ResourceSelectorLTT bind:newResources={resourcesToReview}
    on:ips-retrieved={ async ({ detail }) => { uploadRetrievedIPS(detail) } }>
  </ResourceSelectorLTT>
{/if}
