<script lang="ts">
  import * as jose from 'jose';
  import * as pako from 'pako';
  import { createEventDispatcher, onMount } from 'svelte';
  import { Button,
    Col,
    Dropdown,
    DropdownMenu,
    DropdownItem,
    DropdownToggle,
    FormGroup,
    Icon,
    Input,
    Label,
    Row,
    Spinner,
    TabContent,
    TabPane } from 'sveltestrap';

  import { EXAMPLE_IPS, EXAMPLE_IPS_DEFAULT, IPS_URL_KEY } from './config';
  import issuerKeys from './issuer.private.jwks.json';
  import type { SHCRetrieveEvent } from './types';
  import { page } from '$app/stores';
  import { authorize } from './sofClientTSWrapper';
  
  const tabParam = $page.url.searchParams.get('tab');
  let shlIdParam = $page.url.searchParams.get('shlid');

  const dispatch = createEventDispatcher<{ 'shc-retrieved': SHCRetrieveEvent }>();
  let submitting = false;
  let summaryUrls = EXAMPLE_IPS;
  let defaultUrl = summaryUrls[EXAMPLE_IPS_DEFAULT];
  let uploadFiles: FileList | undefined;
  let currentTab: string | number;
  currentTab = 'url';

  let inputUrl: HTMLFormElement;
  let label = 'SHL from ' + new Date().toISOString().slice(0, 10);
  let isOpen = false;
  let fetchError = "";

  let sofHost = "https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMF0/fhir";
  let expiration: number | null;

  let summaryUrlValidated: URL | undefined = undefined;
  $: {
    setSummaryUrlValidated(defaultUrl);
  }

  onMount(() => {
    if (sessionStorage.getItem(IPS_URL_KEY)) {
      fetchIps();
    }
  })

  function setSummaryUrlValidated(url: string) {
    try {
      summaryUrlValidated = new URL(url);
    } catch {
      summaryUrlValidated = undefined;
    }
  }

  async function fetchIps() {
    submitting = true;
    fetchError = "";
    try {
      let content;

      if (currentTab == 'file' && uploadFiles?.[0] instanceof File) {
        content = JSON.parse(new TextDecoder().decode(await uploadFiles[0].arrayBuffer()));
      } else {
        if (currentTab == 'smart') {
          // TODO: do sof auth
          authorize(sofHost);
          return;
        }
        let preparedIPS = sessionStorage.getItem(IPS_URL_KEY);
        if (preparedIPS) {
          setSummaryUrlValidated(preparedIPS);
        }
        const contentResponse = await fetch(summaryUrlValidated!, {
          headers: { accept: 'application/fhir+json' }
        }).then(function(response) {
          if (!response.ok) {
            // make the promise be rejected if we didn't get a 2xx response
            throw new Error("Unable to fetch IPS", {cause: response});
          } else {
            return response;
          }
        });
        content = await contentResponse.json();
      }

      if (content != undefined && content.verifiableCredential) {
        return dispatch('shc-retrieved', {
          shc: content,
          content
        });
      }

      const shc = await signJws(content);

      sessionStorage.removeItem(IPS_URL_KEY);
      dispatch('shc-retrieved', {
        shc: {
          verifiableCredential: [shc]
        },
        content,
        label,
        exp: expiration ? new Date().getTime() / 1000 + expiration : undefined
      });
    } catch (e) {
      console.log('Failed', e);
      submitting = false;
      fetchError = "Error fetching IPS";
    }
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

<form bind:this={inputUrl} on:submit|preventDefault={() => fetchIps()}>
  <TabContent on:tab={(e) => (currentTab = e.detail)}>
    <TabPane tabId="url" style="padding-top:10px" active>
      <span slot="tab">
        FHIR URL
      </span>
      <FormGroup>
        <Label>Fetch summary from URL</Label>
        <Dropdown {isOpen} toggle={() => (isOpen = !isOpen)}>
          <DropdownToggle tag="div" class="d-inline-block" style="width:100%">
            <Input type="text" bind:value={summaryUrlValidated} />
          </DropdownToggle>
          <DropdownMenu style="width:100%">
            {#each Object.entries(summaryUrls) as [title, url]}
              <DropdownItem style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"  on:click={() => {
                setSummaryUrlValidated(url);
              }}>{title} - {url}</DropdownItem>
            {/each}
          </DropdownMenu>
        </Dropdown>
      </FormGroup>
    </TabPane>
    <TabPane tabId="file" style="padding-top:10px">
      <span slot="tab">
        File Upload
      </span>
      <FormGroup>
        <Label>Upload Bundle (<code>.json</code> or signed <code>.smart-health-card</code>)</Label>
        <Input type="file" name="file" bind:files={uploadFiles} />
      </FormGroup>
    </TabPane>
    <TabPane tabId="smart" style="padding-top:10px">
      <span slot="tab">
        SMART Patient Access
      </span>
        <FormGroup>
          <Label>Fetch via SMART authorization</Label>
          <Input type="radio" bind:group={sofHost} value="https://launch.smarthealthit.org/v/r4/sim/WzMsIiIsIiIsIkFVVE8iLDAsMCwwLCIiLCIiLCIiLCIiLCIiLCIiLCIiLDAsMF0/fhir" label="SMIT (Demo)"/>
          <p class="text-secondary" style="margin-left:25px">Credentials provided</p>
          <Input type="radio" bind:group={sofHost} value="https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4" label="EPIC (Demo)" />
          <p style="margin-left:25px"><a href="https://fhir.epic.com/Documentation?docId=testpatients" class="text-secondary" target="_blank" rel="noreferrer">Test patient credentials <Icon name="box-arrow-up-right" /></a></p>
        </FormGroup>
    </TabPane>
  </TabContent>
  {#if shlIdParam == null}
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

  <Row>
    <Col xs="auto">
      <Button color="primary" style="width:fit-content" disabled={!summaryUrlValidated || submitting} type="submit">
        {#if !submitting}
          Fetch IPS
        {:else}
          Fetching...
        {/if}
      </Button>
    </Col>
    {#if submitting}
    <Col xs="auto">
      <Spinner color="primary" type="border" size="md"/>
    </Col>
    {/if}
  </Row>
  <span class="text-danger">{fetchError}</span>
</form>

<style>
</style>
