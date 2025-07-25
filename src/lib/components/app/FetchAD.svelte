<script lang="ts">
  import {
    Button,
    Col,
    FormGroup,
    Input,
    Label,
    Row,
    Spinner
  } from 'sveltestrap';
  import { createEventDispatcher } from 'svelte';
  import type { DocumentReferencePOLST, ResourceRetrieveEvent } from '$lib/utils/types';
  import type { Attachment, BundleEntry, ServiceRequest } from 'fhir/r4';
  import {
    constructPatientResource,
    buildPatientSearchQuery
  } from '$lib/utils/util';
  import GenderInput from '$lib/components/form/GenderInput.svelte';
  import StateInput from '$lib/components/form/StateInput.svelte';
  import CountryInput from '$lib/components/form/CountryInput.svelte';

  export let sectionKey: string = "Advance Directives";

  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  let sources: Record<string, {selected: Boolean; url: string}> = {
    "WA Health Summary Demo Server": {selected: false, url: "https://fhir.ips-demo.dev.cirg.uw.edu/fhir"},
    "AD Vault": {selected: false, url: "https://qa-rr-fhir.maxmddirect.com"}, // 2025-07 Connectathon
    "AD Vault 2025-07": {selected: false, url: "https://qa-rr-fhir2.maxmddirect.com"}, // 2025-07 Connectathon
    "PACIO Sandbox": {selected: false, url: "https://gw.interop.community/paciosandbox/open"} // 2025-07 Connectathon
    //"AD Vault": {selected: false, url: "https://qa-rr-fhir.maxmddirect.com"},
  };
  let selectedSource = "WA Health Summary Demo Server";
  let processing = false;
  let fetchError = '';

  let mrn = '';
  let first = '';
  let last = '';
  let dob = '';
  let address1 = '';
  let address2 = '';
  let city = '';
  let state = '';
  let zip = '';
  let country = '';
  let phone = '';
  let gender:string = '';

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
      text: {
              status: "generated",
              div: "<div xmlns=\"http://www.w3.org/1999/xhtml\"><h5>Advance Directives</h5><table class=\"hapiPropertyTable\"><thead><tr><th>Scope</th><th>Status</th><th>Action Controlled</th><th>Date</th></tr></thead><tbody></tbody></table></div>"
            },
      entry: []
  };

  $: {
    if (selectedSource) {
      mrn = '';
      first = '';
      last = '';
      dob = '';
      address1 = '';
      address2 = '';
      city = '';
      state = '';
      zip = '';
      phone = '';
      gender = '';
      if (selectedSource === 'WA Health Summary Demo Server') {
        // last = "Gravitate";
        // first = "Maria SEATTLE";
        // gender = "female";
        // dob = "1946-05-05";
        last = "Wilson";
        first = "Cynthia";
        gender = "female";
        dob = "1993-12-01";
      }
      else {
        //last = "Mosley";
        last = "Smith-Johnson";
        //first = "Jenny";
        first = "Betsy";
        gender = "female";
        //dob = "1955-10-03";
        dob = "1950-11-15";
      } 
    }
  }

  let summaryUrlValidated: URL | undefined = undefined;
  $: {
    setSummaryUrlValidated(selectedSource);
  }

  function setSummaryUrlValidated(source: string) {
    try {
      summaryUrlValidated = new URL(sources[source].url);
    } catch {
      summaryUrlValidated = undefined;
    }
  }

  async function fetchPatient(patient: any) {
    let result;
    try {
      result = await fetch(`${sources[selectedSource].url}/Patient/$match`, {
        method: 'POST',
        headers: { accept: 'application/json' },
        body: JSON.stringify(patient)
      }).then(function (response: any) {
        if (!response.ok) {
          // make the promise be rejected if we didn't get a 2xx response
          throw new Error('Unable to fetch patient data', { cause: response });
        } else {
          return response;
        }
      });
    } catch (e) {
      let query = buildPatientSearchQuery(
        {
          first: first,
          last: last,
          gender: gender,
          dob: dob,
          mrn: mrn,
          phone: phone,
          address1: address1,
          address2: address2,
          city: city,
          state: state,
          zip: zip,
          country: country,
        }
      );
      result = await fetch(`${sources[selectedSource].url}/Patient${query}`, {
        method: 'GET',
        headers: { accept: 'application/json' },
      }).then(function (response: any) {
        if (!response.ok) {
          // make the promise be rejected if we didn't get a 2xx response
          throw new Error('Unable to fetch patient data', { cause: response });
        } else {
          return response;
        }
      });
    }
    let body = await result.json();
    if (body.resourceType == 'Bundle' && (body.total == 0 || body.entry.length === 0)) {
      throw new Error('Unable to find patient');
    }
    let patient_response = body.entry[0].resource;
    return patient_response;
  }

  function buildAdvanceDirectiveSearchQuery(patient_id: any) {
    let query = "?";
    query += patient_id ? `_count=1000&subject=${patient_id}&` : '';
    return query.substring(0, query.length - 1);
  }

  async function fetchAdvanceDirective(patient: any) {
    let query = buildAdvanceDirectiveSearchQuery(patient);
    return await fetch(`${sources[selectedSource].url}/DocumentReference${query}`, {
        method: 'GET',
        headers: { accept: 'application/json' }
      }).then(function (response: any) {
        if (!response.ok) {
          // make the promise be rejected if we didn't get a 2xx response
          throw new Error('Unable to fetch advance directive data', { cause: response });
        } else {
          return response;
        }
      });
  }

  async function injectPdfIntoDocRef(url:string, attachment: Attachment) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log(reader.result); // Log the full data URL for debugging
          if (reader.result) {
            // Get base64 encoded data from Data URL
            attachment.data = (reader.result as String).split(',')[1];
          }
        };
        reader.readAsDataURL(blob); // Result is a string like "data:application/pdf;base64,<data>"
  /**
            const arrayBuffer = await response.arrayBuffer();
            const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            attachment.data = base64String;
  */
      } else {
        console.error(`Failed to fetch PDF from ${url}`);
      }
    } catch (error) {
      console.error(`Error fetching PDF from ${url}:`, error);
    }
  }

  async function fetchResourceByUrl(url: string) {
    let result = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/json' }
      }).then(function (response: any) {
        if (!response.ok) {
          // make the promise be rejected if we didn't get a 2xx response
          //throw new Error('Unable to fetch ', { cause: response });
          console.error(`Failed to fetch resource from ${url}`);
        } else {
          return response;
        }
      });
    return result;
  }

  async function prepareIps() {
    fetchError = '';
    processing = true;
    try {
      let content;
      let hostname;
      const patient = await fetchPatient(constructPatientResource(
        {
          first: first,
          last: last,
          gender: gender,
          dob: dob,
          mrn: mrn,
          phone: phone,
          address1: address1,
          address2: address2,
          city: city,
          state: state,
          zip: zip,
          country: country,
        }
      ));
      const contentResponse = await fetchAdvanceDirective(patient.id);
      content = await contentResponse.json();
      hostname = sources[selectedSource].url;
      let resources: Array<DocumentReferencePOLST> = content.entry ? content.entry.map((e: BundleEntry) => {
        return e.resource;
      }) : [];
      if (resources.length === 0) {
        console.warn("No advance directives found for patient "+patient.id);
        processing = false;
        return;
      }

      // Filter out DR's with 'status' == 'superseded'. In May '24 we included these,
      // but they are just noise since IPS doesn't want to address the complexity of
      // showing these in the UI behind something like a "history" element.
      // Lambda function to check this:
      const nonSupersededDR = (dr: DocumentReferencePOLST) => dr.status !== 'superseded';
      // Filter out signature resources
      resources = resources.filter(nonSupersededDR);

      // Iterate over DR's that are for signatures.
      // Get the date from when it was signed, and show that in the card for the DocumentReference
      // that it applies to.
      // That date will be in content.attachment.creation (Lisa to add the evening of 2024-07-17).
      for (let i = resources.length - 1; i >= 0; i--) {
        const dr = resources[i];

        if (dr.relatesTo?.[0]?.code === 'signs' &&
          dr.relatesTo[0].target?.reference) {

          const targetId = dr.relatesTo[0].target.reference.slice(18); // “DocumentReference/”
          const pdfSignDate =
            dr.content?.[0]?.attachment?.creation
            ?? '(missing from content.attachment.creation in signature DocumentReference)';

          const resourceSigned = resources.find(r => r.id === targetId);
          if (resourceSigned) {
            // ad‑hoc property
            (resourceSigned as any).pdfSignedDate = pdfSignDate;
          }

          resources.splice(i, 1);           // ← remove this signature DocumentReference
        }
      }

      // Force reactivity (needed for plain let resources = [] in a component)
      resources = [...resources];

      /**
      resources.forEach((dr: DocumentReferencePOLST) => {
        if (dr.relatesTo && dr.relatesTo[0] && dr.relatesTo[0].code && dr.relatesTo[0].code == 'signs'
          && dr.relatesTo[0].target && dr.relatesTo[0].target.reference) {
          // e.g. "DocumentReference/9fad9465-5c95-49cf-a8ff-c3b8d782894d"
          let target = dr.relatesTo[0].target.reference;
          target = target.substring(18);
          let pdfSignDate = '(missing from content.attachment.creation in signature DocumentReference)'; // placeholder until Lisa's change
          if (dr.content && dr.content[0] && dr.content[0].attachment && dr.content[0].attachment.creation){
            pdfSignDate = dr.content[0].attachment.creation;
          }
          let resourceSigned = resources.find((item) => item.id == target);
          if (resourceSigned) {
            resourceSigned.pdfSignedDate = pdfSignDate; // pdfSignedDate is an ad-hoc property name
          }
        }
      });

      // If the DR has type w/ coding[].system == "http://loinc.org" and coding[].code == "106233-0",
      // then it is a digital signature ("Authenticity information") and should be not be displayed.
      // FIXME may be better to do this when we forEach above.
      const nonSignatureDR = (dr: DocumentReferencePOLST) => 
        (!dr.type | !dr.type.coding | 
        !dr.type.coding.some(coding => coding.system === 'http://loinc.org' && coding.code === '106233-0'));
      resources = resources.filter(nonSignatureDR);
**/
      // July '24: unlike the May '24 connectathon, signature DR's now have resource.category defined.
      // The ADI team is planning to add a code for these later, but for the time being they suggest
      // that we identify these by: "description": "JWS of the FHIR Document",
      // FIXME may be better to do this when we iterate for the TODO above.
      //const nonSignatureDR = (dr: DocumentReferencePOLST) => dr.description !== 'JWS of the FHIR Document';
      // Filter out signature resources
      //resources = resources.filter(nonSignatureDR);

      // if one of the DR's `content` elements has attachment.contentType = 'application/pdf', download if possible, put base64 of pdf in DR.content.attachment.data
      const hasPdfContent = (dr: DocumentReferencePOLST) => dr.content && dr.content.some(content => content.attachment && content.attachment.contentType === 'application/pdf' && !content.attachment.data);

      // TODO 2025-07 cthon, 100821-8 may no longer be a valid code for these... note that 93037-0 refers to a PMO (of which POLST is a sub-type) 
      const isPolst = (dr: DocumentReferencePOLST) => dr.type && dr.type.coding && dr.type.coding.some(coding => coding.system === 'http://loinc.org' && (coding.code === '100821-8' || coding.code === '93037-0'));

      for (let dr of resources) {
        // If this DR is a POLST, add the following chain of queries:
        if (isPolst(dr)){
          dr.isPolst = true;
          // In the POLST find the content[] with format.code = "urn:hl7-org:pe:adipmo-structuredBody:1.1" (ADIPMO Structured Body Bundle),
          const contentAdipmoBundleRef = dr.content.find((content) => {
            return (content.format?.code === 'urn:hl7-org:pe:adipmo-structuredBody:1.1' && content.attachment?.url?.includes('Bundle'));
          });
          // look in that content's attachment.url, that will point at a Bundle (e.g. https://qa-rr-fhir2.maxmddirect.com/Bundle/10f4ff31-2c24-414d-8d70-de3a86bed808?_format=json)
          const adipmoBundleUrl = contentAdipmoBundleRef?.attachment.url;
          if (adipmoBundleUrl) {
            // Pull that Bundle.
            let adipmoBundle = await fetchResourceByUrl(adipmoBundleUrl);
            let adipmoBundleJson = await adipmoBundle.json();

            let serviceRequests = adipmoBundleJson.entry.filter((entry: BundleEntry) => {
                return entry.resource?.resourceType === 'ServiceRequest'
              }).map((entry: BundleEntry) => entry.resource); 

            // That bundle will include ServiceRequest resources; look for the one for CPR (loinc 100822-6)
            // then set the appropriate flags in the DR
            (
              {
                exists: dr.isCpr,
                doNotPerform: dr.doNotPerformCpr
              } = digestServiceRequestByCode(serviceRequests, '100822-6')
            );

            // That bundle will include ServiceRequest resources; look for the one for "Initial portable medical treatment orders" (loinc 100823-4) aka Comfort Treatments
            // then set the appropriate flags in the DR
            (
              {
                exists: dr.isComfortTreatments,
                doNotPerform: dr.doNotPerformComfortTreatments,
                type: dr.typeComfortTreatments,
                detail: dr.detailComfortTreatments
              } = digestServiceRequestByCode(serviceRequests, '100823-4')
            );

            // That bundle will include ServiceRequest resources; look for the one for "Additional..." (loinc 100824-2)
            // then set the appropriate flags in the DR
            (
              {
                exists: dr.isAdditionalTx,
                doNotPerform: dr.doNotPerformAdditionalTx,
                detail: dr.detailAdditionalTx
              } = digestServiceRequestByCode(serviceRequests, '100824-2')
            );

            // That bundle will include ServiceRequest resources; look for the one for "Medically assisted nutrition orders" (loinc 100825-9)
            // then set the appropriate flags in the DR
            (
              {
                exists: dr.isMedicallyAssisted,
                doNotPerform: dr.doNotPerformMedicallyAssisted,
                detail: dr.detailMedicallyAssisted
              } = digestServiceRequestByCode(serviceRequests, '100825-9')
            );
          }
        }
      }

      for (let dr of resources) {
        if (hasPdfContent(dr)) {
          const pdfContent = dr.content.find(content => content.attachment && content.attachment.contentType === 'application/pdf');
          if (pdfContent && pdfContent.attachment && pdfContent.attachment.url) {
            await injectPdfIntoDocRef (pdfContent.attachment.url, pdfContent.attachment);
          }
        }
      }
      
      processing = false;
      let result:ResourceRetrieveEvent = {
        resources: resources,
        sectionKey: sectionKey,
        sectionTemplate: sectionTemplate,
        source: hostname,
      }
      resourceDispatch('update-resources', result);
      console.log([patient, ...resources]);
    } catch (e) {
      processing = false;
      console.log('Failed', e);
      fetchError = 'Error preparing IPS';
    }
  }

  interface ServiceRequestProperties {
    exists: boolean;
    doNotPerform?: boolean;
    type?: string;
    detail?: string;
  }

  function digestServiceRequestByCode(srs: ServiceRequest[], code: string): ServiceRequestProperties {
    const serviceRequest = srs.find((resource: ServiceRequest) => {
      return resource.category?.[0].coding?.[0].code === code;
    });
    return {
      exists: serviceRequest !== undefined,
      doNotPerform: serviceRequest?.doNotPerform === true,
      type: serviceRequest?.orderDetail?.[0].text ?? serviceRequest?.code?.coding?.[0].display,
      detail: serviceRequest?.note?.[0].text ?? serviceRequest?.orderDetail?.[0].text
    };
  }
</script>

<form on:submit|preventDefault={() => prepareIps()}>
  <Label>Fetch Advance Directives to include in your summary</Label><br>
  <Label>Select a source to search:</Label>
  <FormGroup>
    <Row>
      {#each Object.keys(sources) as source}
        <Row class="mx-2">
          <Input type="radio" bind:group={selectedSource} value={source} label={source} />
        </Row>
      {/each}
    </Row>
  </FormGroup>
  {#if selectedSource}
  <FormGroup>
    <Label>Enter your information to fetch related advance directives</Label>
    <p class="text-secondary"><em>WA Health Summary does not save this information</em></p>
    <Row cols={{ md: 2, sm: 1 }}>
      <Col>
        <Label>Name</Label>
        <FormGroup style="font-size:small" class="text-secondary" label="First">
          <Input type="text" bind:value={first} />
        </FormGroup>
        <FormGroup style="font-size:small" class="text-secondary" label="Last">
          <Input type="text" bind:value={last} />
        </FormGroup>
        <Label>Demographics</Label>
        <FormGroup style="font-size:small" class="text-secondary" label="Date of Birth">
          <Input type="date" bind:value={dob} placeholder={dob} style="width: 165px"/>
        </FormGroup>
        <FormGroup style="font-size:small" class="text-secondary" label="Gender">
          <GenderInput bind:value={gender} />
        </FormGroup>
        <FormGroup>
          <Label>MRN</Label>
          <Input type="text" bind:value={mrn} style="width: 165px"/>
        </FormGroup>
        <Label>Contact Information</Label>
        <FormGroup style="font-size:small" class="text-secondary" label="Phone">
          <Input type="tel" bind:value={phone} style="width: 165px"/>
        </FormGroup>
        <Label>Address</Label>
        <FormGroup style="font-size:small" class="text-secondary" label="Address Line 1">
          <Input type="text" bind:value={address1} />
        </FormGroup>
        <FormGroup style="font-size:small" class="text-secondary" label="Address Line 2 (Optional)">
          <Input type="text" bind:value={address2} />
        </FormGroup>
        <FormGroup style="font-size:small" class="text-secondary" label="City">
          <Input type="text" bind:value={city} />
        </FormGroup>
        <Row>
          <Col xs="auto">
            <FormGroup style="font-size:small" class="text-secondary" label="State">
              <StateInput bind:value={state} />
            </FormGroup>
          </Col>
          <Col>
            <FormGroup style="font-size:small" class="text-secondary" label="Zip">
              <Input type="text" bind:value={zip} style="width:90px"/>
            </FormGroup>
          </Col>
          <Col xs="auto">
            <FormGroup style="font-size:small" class="text-secondary" label="Country">
              <CountryInput bind:value={country} />
            </FormGroup>
          </Col>
        </Row>
      </Col>
    </Row>
  </FormGroup>
  
  <Row>
    <Col xs="auto">
      <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
        {#if !processing}
          Add advance directives to Summary
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
  {/if}
</form>

<span class="text-danger">{fetchError}</span>
