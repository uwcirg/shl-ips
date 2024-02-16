<script lang="ts">
    import * as jose from 'jose';
    import * as pako from 'pako';
    import { createEventDispatcher, onMount, getContext } from 'svelte';
    import FetchSoFLTT from './FetchSoFLTT.svelte';
    import type { Writable } from 'svelte/store';
    import type { SHLAdminParams, SHLClient } from '$lib/managementClient';

    import issuerKeys from './issuer.private.jwks.json';
    import type { SHCFile,
      Bundle,
      ResourceRetrieveEvent,
      SHLRetrieveEvent,
      SHLSubmitEvent} from './types';
    import RetrieveShl from './RetrieveSHL.svelte';

    let shlStore: Writable<SHLAdminParams> = getContext('shlStore');
    let shlClient: SHLClient = getContext('shlClient');

    const shlReadyDispatch = createEventDispatcher<{ 'shl-ready': boolean }>();
    const shlDispatch = createEventDispatcher<{ 'shl-submitted': SHLSubmitEvent }>();
    let submitting = false;
    let fetchError = "";

    let shlResult: SHLRetrieveEvent = {
      shl: undefined
    }

    let resourceResult: ResourceRetrieveEvent = {
      resources: undefined
    }

    let resourcesToReview: any[] = [];
    let shcsToAdd: SHCFile[] = [];

    let label = `Let’s Talk Tech Choices Report (${new Date().toLocaleDateString('en-US', {day: 'numeric', month: 'long', year: 'numeric'})})`;
    let expiration: number | null = -1;
    let passcode = "";

    onMount(() => {

    });

    $: {
      if (resourcesToReview.length > 0 && $shlStore !== undefined) {
        console.log("Successfully retrieved SHL and Resources");
        // Compare sessionIDs in most recent DocRef with sessionID in most recent SHL
        let mostRecentDocRef = resourcesToReview.sort((a, b) => a.meta.lastUpdated - b.meta.lastUpdated)[0];
        if ($shlStore.sessionId == mostRecentDocRef.sessionId) {
          // Use the most recent shl
          shlReadyDispatch('shl-ready', true);
        } else {
          // Create a new SHL if out of date
          packageShc(mostRecentDocRef).then((shc) => {
            shcsToAdd.unshift(shc);
            return submitShl();
          }).then((shl) => {
            shlResult.shl = shl;
            shlReadyDispatch('shl-ready', true);
          });
        }
      }
    }

    async function handleNewResources(details: ResourceRetrieveEvent) {
      try {
        resourceResult = details;
        if (resourceResult.resources) {
          // Trigger update in ResourceSelector
          resourcesToReview = resourceResult.resources;
        }
      } catch (e) {
        console.log('Failed', e);
        fetchError = "Error preparing IPS";
      }
    }

    async function updateShl(details: SHLRetrieveEvent) {
      try {
        shlResult = details;
        if (shlResult.shl) {
          // Trigger update in store
          $shlStore = shlResult.shl;
        }
      } catch (e) {
        console.log('Failed', e);
        fetchError = "Error preparing IPS";
      }
    }
    
    function isShcFile(object: any): object is SHCFile {
      return 'verifiableCredential' in object;
    }

    async function packageShc(content:SHCFile | Bundle | undefined): Promise<SHCFile> {
        if (content != undefined && isShcFile(content) && content.verifiableCredential) {
          return content;
        }

        const shc = await signJws(content);

        return { verifiableCredential: [shc] };
    }

    function submitShl(): Promise<SHLAdminParams>{
      return newShlFromShc({
        shcs: shcsToAdd,
        label,
        passcode: passcode ?? undefined,
        exp: expiration && expiration > 0 ? new Date().getTime() / 1000 + expiration : undefined
      });
    }

    async function addFiles(shl:SHLAdminParams, fileList:SHCFile[]): Promise<SHLAdminParams> {
      for (let i=0; i < fileList.length; i++) {
        shl = await shlClient.addFile(shl, fileList[i], 'application/smart-health-card');
      }
      return shl;
    }

    async function newShlFromShc(details: SHLSubmitEvent): Promise<SHLAdminParams> {
      let shlCreated = await shlClient.createShl({exp: details.exp, passcode: details.passcode });
      shlCreated = await addFiles(shlCreated, details.shcs);
      shlCreated.label = details.label;
      shlCreated.passcode = details.passcode;
      return shlCreated;
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

<RetrieveShl
  on:shl-retrieved={ async ({ detail }) => { updateShl(detail) } }
/>

<FetchSoFLTT
  on:updateResources={ async ({ detail }) => { handleNewResources(detail) } }
/>
