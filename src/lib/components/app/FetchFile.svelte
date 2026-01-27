<script lang="ts">
    import {
        Button, 
        Col,
        FormGroup,
        Input,
        Label,
        Row,
        Spinner } from '@sveltestrap/sveltestrap';
    import type { ResourceRetrieveEvent, SHCFile } from '$lib/utils/types';
    import { getResourcesFromIPS, isSHCFile } from '$lib/utils/util';
    import { verify } from '$lib/utils/shcDecoder.js';
    import { createEventDispatcher } from 'svelte';
    import type { Composition } from 'fhir/r4';
    import FHIRDataServiceChecker from '$lib/components/app/FHIRDataServiceChecker.svelte';
    import { METHODS, CATEGORIES } from '$lib/config/tags';

    export let disabled = false;
    
    const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

    const CATEGORY = CATEGORIES.PROVIDER_HEALTH_RECORD;
    const METHOD = METHODS.PROVIDER_HEALTH_RECORD_FILE;
    let FHIRDataServiceCheckerInstance: FHIRDataServiceChecker | undefined;

    let resourceResult: ResourceRetrieveEvent = {
        resources: undefined,
        category: CATEGORY,
        method: METHOD,
        sourceName: undefined,
        source: undefined
    };

    let uploadFiles: FileList | undefined;
    let processing = false;
    let fetchError = "";
    let source: string | undefined;

    async function decodeSHC(shc: SHCFile) {
      try {
        if (shc && isSHCFile(shc)) {
          const decoded = await verify(shc.verifiableCredential[0]);
          const data = decoded.fhirBundle;
          return data;
        } else {
          throw Error("Empty or invalid smart health card");
        }
    
      } catch (e) {
        console.log('Failed', e);
        fetchError = "Error processing health card";
      }
    }
  
    async function retrieveIps() {
        processing = true;
        fetchError = "";
        try {
            let content;
            let filename;
    
            if (uploadFiles?.[0] instanceof File) {
                filename = uploadFiles[0].name;
                content = JSON.parse(new TextDecoder().decode(await uploadFiles[0].arrayBuffer()));
            }
            let bundle;
            source = filename;
            if (content == undefined) { throw Error("Error: file is empty."); }
            if (content.verifiableCredential) {
                bundle = await decodeSHC(content);
            } else if (content.resourceType == "Bundle") {
                bundle = content;
            } else {
                throw Error("Error: file must contain a FHIR Bundle.");
            }
            if (!source) {
                source = source || filename;
            }
            let resources;
            let composition = bundle.entry.find(entry => entry.resource.resourceType === "Composition").resource as Composition;
            if (composition && composition.type?.coding?.[0].system === "http://loinc.org" && composition.type?.coding?.[0].code === "60591-5") {
                resources = getResourcesFromIPS(bundle);
            } else {
                resources = bundle.entry.map(entry => entry.resource);
            }
            if (!resources) { throw Error("Error: file contains no FHIR resources."); }
            processing = false;
            resourceResult.resources = resources;
            resourceResult.source = source;
            resourceResult.sourceName = filename;
            resourceDispatch('update-resources', resourceResult);
        } catch (e) {
            processing = false;
            console.log('Failed', e);
            fetchError = "Error preparing IPS";
        }
    }
</script>

<form on:submit|preventDefault={() => FHIRDataServiceCheckerInstance.checkFHIRDataServiceBeforeFetch(CATEGORY, source, retrieveIps)}>
    <FormGroup>
        <Label>Upload a FHIR Bundle (<code>.json</code> or signed <code>.smart-health-card</code>)</Label>
        <Input type="file" name="file" bind:files={uploadFiles} />
    </FormGroup>

    <Row>
        <Col xs="auto">
        <Button color="primary" style="width:fit-content" disabled={processing || disabled} type="submit">
            {#if !processing}
            Fetch Data
            {:else}
            Fetching...
            {/if}
        </Button>
        </Col>
        {#if processing}
        <Col xs="auto" class="d-flex align-items-center px-0">
            <Spinner color="primary" type="border" size="md"/>
        </Col>
        {/if}
        {#if disabled}
          <Col xs="auto" class="d-flex align-items-center px-0">
            Please wait...
          </Col>
        {/if}
    </Row>
</form>
<FHIRDataServiceChecker bind:this={FHIRDataServiceCheckerInstance}/>

<span class="text-danger">{fetchError}</span>

  