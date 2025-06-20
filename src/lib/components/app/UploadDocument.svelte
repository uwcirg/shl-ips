<script lang="ts">
    import {
        Button, 
        Col,
        FormGroup,
        Input,
        Label,
        Row,
        Spinner } from 'sveltestrap';
    import type { ResourceRetrieveEvent } from '$lib/utils/types';
    import { createEventDispatcher } from 'svelte';
    
    const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

    let uploadFiles: FileList | undefined;
    let processing = false;
    let fetchError = "";

    let fileData: Record<string, string> = {};
    $: {
        if (uploadFiles) {
            fetchError = "";
            for (let i = 0; i < uploadFiles.length; i++) {
                const file = uploadFiles[i];
                if (file instanceof File) {
                    if (file.type !== 'application/pdf') {
                        fetchError = `${file.name} is not a PDF`;
                        continue;
                    }
                }
            }
        }
    }

    let resourceResult: ResourceRetrieveEvent = {
        resource: undefined
    };

    let sectionKey = "Advance Directives";

    let sectionTemplate = {
      title: "Advance Directives",
      code: {
        coding: [
            {
                system: "http://loinc.org",
                code: "42348-3",
                display: "Advance Directives"
            }
            ]
        },
        entry: []
    };
    let resourceTemplate = {
        resourceType: "DocumentReference",
        status: "current",
        docStatus: "final",
        type: {
        coding: [
            {
            system: "http://loinc.org",
            code: "100821-8",
            display: "National POLST form: portable medical order panel"
            }
        ]
        },
        category: [
        {
            coding: [
            {
                system: "http://loinc.org",
                code: "42348-3",
                display: "Advance Healthcare Directive"
            }
            ]
        }
        ],
        subject: {
        reference: "Patient/14599"
        },
        date: "",
        description: "National ePOLST Form: A Portable Medical Order\n    - Version 1",
        securityLabel: [
        {
            coding: [
            {
                system: "http://hl7.org/fhir/v3/Confidentiality",
                code: "N",
                display: "normal"
            }
            ]
        }
        ],
        content: [
        {
            attachment: {
            contentType: "application/pdf",
            creation: "",
            data: ""  
            }
        }
        ]
    };

  
    async function retrieveDocument() {
        processing = true;
        fetchError = "";
        try {
            let content;
            let filename: string;
            if (uploadFiles) {
                for (let i = 0; i < uploadFiles.length; i++) {
                    const file = uploadFiles[i];
                    if (file instanceof File) {
                        if (file.type !== 'application/pdf') {
                            fetchError = `${file.name} is not a PDF`;
                            continue;
                        }
                        filename = file.name;
                        const reader = new FileReader();
                        reader.onload = () => {
                            let encoding = (reader.result as string).split(',')[1]; // remove data: URL prefix
                            let resource = JSON.parse(JSON.stringify(resourceTemplate));
                            resource.content[0].attachment.data = encoding;
                            let createdDate = new Date().toISOString();
                            resource.content[0].attachment.creation = createdDate;
                            resource.date = createdDate;
                            fileData[filename] = resource;
                        };
                        reader.readAsDataURL(file);
                    }
                }
            }
            processing = false;
            let resources = Object.values(fileData);
            let result:ResourceRetrieveEvent = {
                resources: resources,
                sectionKey: sectionKey,
                sectionTemplate: sectionTemplate
            }
            resourceDispatch('update-resources', result);
        } catch (e) {
            processing = false;
            console.log('Failed', e);
            fetchError = "Error adding file";
        }
    }
</script>

<form on:submit|preventDefault={() => retrieveDocument()}>
    <FormGroup>
        <Label>Add a POLST document to upload (<code>.pdf</code>)</Label>
        <Input type="file" name="file" bind:files={uploadFiles} />
    </FormGroup>

    <Row>
        <Col xs="auto">
        <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
            {#if !processing}
            Add File{(uploadFiles?.length ?? 0) > 1 ? `s` : ""}
            {:else}
            Adding...
            {/if}
        </Button>
        </Col>
        {#if processing}
        <Col xs="auto" class="d-flex align-items-center px-0">
            <Spinner color="primary" type="border" size="md"/>
        </Col>
        {/if}
    </Row>
</form>

<span class="text-danger">{fetchError}</span>

  