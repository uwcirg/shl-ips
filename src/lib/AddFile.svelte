<script lang="ts">
    import * as jose from 'jose';
    import * as pako from 'pako';
    import { createEventDispatcher } from 'svelte';
    import {
        FormGroup,
        Input,
        Label,
        Nav,
        NavItem,
        NavLink,
        TabContent,
        TabPane } from 'sveltestrap';
    import FetchUrl from './FetchUrl.svelte';
    import FetchFile from './FetchFile.svelte';
    import FetchSoF from './FetchSoF.svelte';
    import ResourceSelector from './ResourceSelector.svelte';

    import issuerKeys from './issuer.private.jwks.json';
    import type { SHCFile,
      Bundle,
      SHCRetrieveEvent,
      ResourceRetrieveEvent,
      IPSRetrieveEvent,
      SHLSubmitEvent } from './types';
    import { page } from '$app/stores';
    
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

    let resourcesToReview: any[] | undefined = [];
    let shcsToAdd: SHCFile[] = [];

    let label = 'SHL from ' + new Date().toISOString().slice(0, 10);
    let expiration: number | null;

    async function handleResourceResultUpdate(details: ResourceRetrieveEvent) {
        try {
          resourceResult = details;
          if (resourceResult.resources) {
            resourcesToReview = resourceResult.resources;
          }
        } catch (e) {
          console.log('Failed', e);
          submitting = false;
          fetchError = "Error preparing IPS";
        }
    }

    async function handleSHCResultUpdate(details: SHCRetrieveEvent) {
        try {
          shcResult = details;
          if (shcResult.shc) {
            shcsToAdd.push(await packageSHC(shcResult.shc));
          }
        } catch (e) {
          console.log('Failed', e);
          submitting = false;
          fetchError = "Error processing SHC";
        }
    }

    async function handleRetrievedIPS(details: IPSRetrieveEvent) {
      try {
        ipsResult = details;
        if (ipsResult.ips) {
          shcsToAdd.unshift(await packageSHC(ipsResult.ips));
        }
      } catch (e) {
        console.log('Failed', e);
        submitting = false;
        fetchError = "Error preparing IPS";
      }
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
        exp: expiration ? new Date().getTime() / 1000 + expiration : undefined
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

<TabContent on:tab={(e) => {
  currentTab = e.detail;
}}>
  <TabPane tabId="url" style="padding-top:10px" active={currentTab == "url"}>
    <span slot="tab">FHIR URL</span>
    <FetchUrl
      on:updateResources={ async ({ detail }) => { handleResourceResultUpdate(detail) } }
      on:updateSHC={ async ({ detail }) => { handleSHCResultUpdate(detail) } }>
    </FetchUrl>
  </TabPane>
  <TabPane tabId="file" style="padding-top:10px" active={currentTab == "file"}>
    <span slot="tab">File Upload</span>
    <FetchFile
      on:updateResources={ async ({ detail }) => { handleResourceResultUpdate(detail) } }
      on:updateSHC={ async ({ detail }) => { handleSHCResultUpdate(detail) } }>
    </FetchFile>
  </TabPane>
  <TabPane tabId="smart" style="padding-top:10px" active={currentTab == "smart"}>
    <span slot="tab">SMART Patient Access</span>
    <FetchSoF
      on:updateResources={ async ({ detail }) => { handleResourceResultUpdate(detail) } }
      on:updateSHC={ async ({ detail }) => { handleSHCResultUpdate(detail) } }>
    </FetchSoF>
  </TabPane>
</TabContent>

{#if resourcesToReview != undefined && resourcesToReview.length > 0}
<br/>
  <ResourceSelector bind:newResources={resourcesToReview}
    on:ips-retrieved={ async ({ detail }) => { handleRetrievedIPS(detail) } }>
  </ResourceSelector>
  {#if shlIdParam == null}
  <br/>
    <FormGroup>
      <Label>New SHLink Label</Label>
      <Input type="text" bind:value={label} />
    </FormGroup>
    <FormGroup>
      <Label>Expiration</Label>
      <Input type="radio" bind:group={expiration} value={60 * 60} label="1 hour" />
      <Input type="radio" bind:group={expiration} value={60 * 60 * 24 * 7} label="1 week" />
      <Input type="radio" bind:group={expiration} value={60 * 60 * 24 * 7 * 365} label="1 year" />
      <Input type="radio" bind:group={expiration} value={null} label="Never" />
    </FormGroup>
  {/if}
  <span class="text-danger">{fetchError}</span>
{/if}
