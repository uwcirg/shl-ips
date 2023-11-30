<script lang="ts">
    import * as jose from 'jose';
    import * as pako from 'pako';
    import { createEventDispatcher, onMount } from 'svelte';
    import {
        Button,
        Card,
        CardBody,
        CardText,
        Col,
        FormGroup,
        Icon,
        Input,
        Label,
        Row,
        Spinner,
        TabContent,
        TabPane } from 'sveltestrap';
    import FetchUrl from './FetchUrl.svelte';
    import FetchFile from './FetchFile.svelte';
    import FetchSoF from './FetchSoF.svelte';
    import ResourceSelector from './ResourceSelector.svelte';
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
    import { getResourcesFromIPS } from './resourceUploaderTSWrapper';
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

    onMount(() => {
      if (sessionStorage.getItem('URL')) {
        let url = sessionStorage.getItem('URL') ?? '/create';
        sessionStorage.removeItem('URL');
        return goto(url);
      }
      currentTab = sessionStorage.getItem('TAB') ?? currentTab;
      label = sessionStorage.getItem('LABEL') ?? label;
      if (sessionStorage.getItem('RESOURCES')) {
        resourcesToReview = JSON.parse(sessionStorage.getItem('RESOURCES') ?? "") ?? resourcesToReview;
      }
      if (sessionStorage.getItem('EXPIRE')) {
        expiration = JSON.parse(sessionStorage.getItem('EXPIRE') ?? "-1");
      }
      sessionStorage.removeItem('RESOURCES');
      sessionStorage.removeItem('TAB');
      sessionStorage.removeItem('LABEL');
      sessionStorage.removeItem('EXPIRE');
    });

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

<TabContent on:tab={(e) => {
  currentTab = e.detail;
}}>
  <TabPane tabId="url" style="padding-top:10px" active={currentTab == "url"}>
    <span slot="tab">FHIR URL</span>
    <FetchUrl
      on:shc-retrieved={ async ({ detail }) => { handleSHCResultUpdate(detail) } }
      on:ips-retrieved={ async ({ detail }) => { stageRetrievedIPS(detail) } }>
    </FetchUrl>
  </TabPane>
  <TabPane tabId="file" style="padding-top:10px" active={currentTab == "file"}>
    <span slot="tab">File Upload</span>
    <FetchFile
      on:shc-retrieved={ async ({ detail }) => { handleSHCResultUpdate(detail) } }
      on:ips-retrieved={ async ({ detail }) => { stageRetrievedIPS(detail) } }>
    </FetchFile>
  </TabPane>
  <TabPane tabId="smart" style="padding-top:10px" active={currentTab == "smart"}>
    <span slot="tab">SMART Patient Access</span>
    <FetchSoF
      on:sofAuthEvent={ async ({ detail }) => { preAuthRedirectHandler(detail) } }
      on:updateResources={ async ({ detail }) => { handleNewResources(detail) } }
      on:shc-retrieved={ async ({ detail }) => { handleSHCResultUpdate(detail) } }>
    </FetchSoF>
  </TabPane>
</TabContent>

{#if resourcesToReview.length > 0}
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
      <Input type="radio" bind:group={expiration} value={-1} label="Never" />
    </FormGroup>
  {/if}
  <span class="text-danger">{fetchError}</span>
  {#if resourcesToReview.length > 0}
    {#if ipsResult.ips}
      <Row class="align-items-center">
        <Col xs="auto">
          <Button
            color="secondary"
            style="width:fit-content"
            disabled={submitting}
            type="button"
            on:click={() => {uploadRetrievedIPS(ipsResult)}}>
            {#if !submitting}
            Submit Unchanged IPS
            {:else}
            Submitting...
            {/if}
          </Button>
        </Col>
        {#if submitting}
        <Col xs="auto">
          <Spinner color="primary" type="border" size="md"/>
        </Col>
        {/if}
        <Col xs="auto">
          <Card color="light">
            <CardBody>
              <CardText color="light" style="overflow: hidden; text-overflow: ellipsis">
                <Icon name="file-earmark-text" /> {ipsResult.source}
              </CardText>
            </CardBody>
          </Card>
        </Col>
      </Row>
      <br/>
    {/if}
    <ResourceSelector bind:newResources={resourcesToReview}
      on:ips-retrieved={ async ({ detail }) => { uploadRetrievedIPS(detail) } }>
    </ResourceSelector>
  {/if}
{/if}
