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

  import type { ResourceRetrieveEvent } from './types';
  import { createEventDispatcher } from 'svelte';

  export let adSection: any | undefined;
  export let adSectionResources: any[] | undefined;

  const resourceDispatch = createEventDispatcher<{ 'update-resources': ResourceRetrieveEvent }>();

  let sources = {
    "AD Vault": {selected: false, url: "https://qa-rr-fhir.maxmddirect.com"},
    "WA Verify+ Demo Server": {selected: false, url: "https://fhir.ips-demo.dev.cirg.uw.edu/fhir"}
  }
  let selectedSource = "AD Vault";
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
  let phone = '';
  let gender:string = '';
  let genders: Record<string, any> = {
    "Female": 'female',
    "Male": 'male',
    "Other": 'other'
  };
  let states: Array<string> = [
    'AL','AK','AZ','AR','CA','CO','CT',
    'DC','DE','FL','GA','GU','HI','ID',
    'IL','IN','IA','KS','KY','LA','ME',
    'MD','MA','MI','MH','MN','MP','MS',
    'MO','MT','NE','NV','NH','NJ','NM',
    'NY','NC','ND','OH','OK','OR','PA',
    'PR','RI','SC','SD','TN','TX','UT',
    'VT','VA','VI','WA','WV','WI','WY'
  ];

  let result: ResourceRetrieveEvent = {
    resources: undefined
  };

  let adSectionTemplate = {
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
      if (selectedSource === 'AD Vault') {
        last = "Smith-Johnson";
        first = "Betsy";
        gender = "Female";
        dob = "1950-11-15";
      } else if (selectedSource === 'WA Verify+ Demo Server') {
        last = "deBronkartTest";
        first = "DaveTest";
        gender = "Male";
        dob = "1951-01-20";
      }
    }
  }

  function updateAdSection(resources: any[]) {
    if (adSection === undefined) {
      adSection = JSON.parse(JSON.stringify(adSectionTemplate));
    }
    let resourcesAsEntries = resources.map((r, index) => {
        r.id = `advance-directive-document-${index+1}`;
        let entry = {resource: r, fullUrl: `urn:uuid:${r.id}`};
        return entry;
      });
    if (adSectionResources) {
      adSectionResources = adSectionResources.concat(resourcesAsEntries);
    } else {
      adSectionResources = resourcesAsEntries;
    }
    adSection.entry = adSectionResources.map((r) => {
      return {
        reference: r.fullUrl
      }
    });
    console.log(adSectionResources);
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

  function constructPatient() {
    let patient = {
      resourceType: 'Patient',
      identifier: [
        {
          use: 'usual',
          type: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                code: 'MR',
                display: 'Medical Record Number'
              }
            ],
            text: 'Medical Record Number'
          },
          system: 'http://hospital.smarthealthit.org',
          value: mrn
        }
      ],
      active: true,
      name: [
        {
          family: last,
          given: [first]
        }
      ],
      telecom: [
        {
          system: 'phone',
          value: phone,
          use: 'home'
        }
      ],
      gender: genders[gender],
      birthDate: dob,
      address: [
        {
          line: (address2 ? [address1, address2] : [address1]),
          city: city,
          state: state,
          postalCode: zip,
          country: 'US'
        }
      ]
    };
    return patient;
  }

  function buildPatientSearchQuery() {
    let query = "?";
    if (selectedSource === 'AD Vault') {
      query += 'active=true&'; 
    }
    query += dob ? `birthdate=${dob}&` : '';
    query += first ? `given=${first}&` : '';
    query += last ? `family=${last}&` : '';
    query += gender ? `gender=${genders[gender]}&` : '';
    query += mrn ? `identifier=${mrn}&` : '';
    query += phone ? `phone=${phone}&` : '';
    query += address1 || address2 ? `address=${(address1+' '+address2).trim().replaceAll(' ', '+')}&` : '';
    query += city ? `address-city=${city}&` : '';
    query += state ? `address-state=${state}&` : '';
    query += zip ? `address-postalcode=${zip}&` : '';
    query = query.substring(0, query.length - 1);
    return query;
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
      let query = buildPatientSearchQuery();
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
    let patient_response = body.entry[body.entry.length - 1].resource;
    return patient_response;
  }

  function buildAdvanceDirectiveSearchQuery(patient_id: any) {
    let query = "?";
    query += patient_id ? `subject=${patient_id}&` : '';
    return query.substring(0, query.length - 1);
  }

  async function fetchAdvanceDirective(patient: any) {
    let query = buildAdvanceDirectiveSearchQuery(patient);
    return result = await fetch(`${sources[selectedSource].url}/DocumentReference${query}`, {
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

  async function injectPdfIntoDocRef(url, attachment) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log(reader.result); // Log the full data URL for debugging
          attachment.data = reader.result?.split(',')[1]; // Base64 encoded data
        };
        reader.readAsDataURL(blob);
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

  async function prepareIps() {
    fetchError = '';
    processing = true;
    try {
      let content;
      let hostname;
      const patient = await fetchPatient(constructPatient());
      const contentResponse = await fetchAdvanceDirective(patient.id);
      content = await contentResponse.json();
      hostname = sources[selectedSource].url;
      processing = false;
      let resources = content.entry ? content.entry.map((e) => {
        return e.resource;
      }) : [];
      if (resources.length === 0) {
        console.warn("No advance directives found for patient "+patient.id);
      }

      // If resource.category doesn't exist, ignore the DR - DR's w/out that are simply signature DR's.
      // Lambda function to check if resource.category exists
      const nonSignatureDR = dr => dr.category !== undefined;
      // Filter out resources that don't have a category
      resources = resources.filter(nonSignatureDR);

      // if one of the DR's `content` elements has attachment.contentType = 'application/pdf', download if possible, put base64 of pdf in DR.content.attachment.data
      const hasPdfContent = dr => dr.content && dr.content.some(content => content.attachment && content.attachment.contentType === 'application/pdf' && !content.attachment.data);

      resources.forEach(async dr => {
        if (hasPdfContent(dr)) {
          const pdfContent = dr.content.find(content => content.attachment && content.attachment.contentType === 'application/pdf');
          if (pdfContent && pdfContent.attachment && pdfContent.attachment.url) {
            await injectPdfIntoDocRef (pdfContent.attachment.url, pdfContent.attachment);
          }
        }
      });
      updateAdSection(resources);
      // resources.unshift(patient);
      result = {
        resources: [patient], // resources,
        source: hostname
      };
      console.log([patient, ...resources]);
      resourceDispatch('update-resources', result);
    } catch (e) {
      processing = false;
      console.log('Failed', e);
      fetchError = 'Error preparing IPS';
    }
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
    <p class="text-secondary"><em>WA Verify+ does not save this information</em></p>
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
          <!-- <Label>Gender</Label> -->
          <Input type="select" bind:value={gender} style="width: 100px">
            {#each Object.keys(genders) as full}
              <option value={full} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                {full}
              </option>
            {/each}
          </Input>
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
              <Input type="select" bind:value={state} style="width: 80px">
                {#each states as state}
                  <option value={state} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
                    {state}
                  </option>
                {/each}
              </Input>
            </FormGroup>
          </Col>
          <Col>
            <FormGroup style="font-size:small" class="text-secondary" label="Zip">
              <Input type="text" bind:value={zip} style="width:90px"/>
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
          Fetching...
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
