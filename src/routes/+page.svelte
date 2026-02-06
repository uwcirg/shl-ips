<script lang="ts">
  import { Accordion, AccordionItem, Button, Card, CardBody, Col, Row } from '@sveltestrap/sveltestrap';
  import { getContext } from 'svelte';
  import { get } from 'svelte/store';
  import { goto } from '$app/navigation';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import type { IAuthService } from '$lib/utils/types';

  let authService: IAuthService = getContext('authService');
  let authenticated = authService.authenticated;

  function checkAuth() {
    if (!get(authService.authenticated)) {
      authService.login();
    }
  }

  function myData() {
    checkAuth();
    goto('/data');
  }

  function mySummaries() {
    checkAuth();
    goto('/summaries');
  }
</script>

<svelte:component this={INSTANCE_CONFIG.pages?.home?.introComponent} />

<Row class="mt-4 mb-5 d-flex justify-content-center">
  <Row class="d-flex justify-content-center">
    {#if $authenticated}
      <Col class="d-flex align-items-center px-2">
        <Card color="light" class="flex-fill">
          <CardBody>
            <Button color="primary" size="lg" on:click={() => myData()} class="px-5 w-100"
              >My Health Data</Button
            >
          </CardBody>
        </Card>
      </Col>
      <Col class="d-flex align-items-center px-2">
        <Card color="light" class="flex-fill">
          <CardBody>
            <Button color="primary" size="lg" on:click={() => mySummaries()} class="px-5 w-100"
              >My Summaries</Button
            >
          </CardBody>
        </Card>
      </Col>
    {:else}
      <Col class="col-sm-12 col-md-8">
        <Card color="light">
          <CardBody>
            <Row class="d-flex justify-content-center align-items-center px-3">
              <Button color="primary" size="lg" on:click={() => checkAuth()}
                >Sign Up or Sign In</Button
              >
            </Row>
          </CardBody>
        </Card>
      </Col>
    {/if}
  </Row>
</Row>
<Row>
  <Accordion>
    <AccordionItem>
      <h5 slot="header">Privacy and Trust</h5>
      <svelte:component this={INSTANCE_CONFIG.pages?.home?.privacyComponent} />
    </AccordionItem>
    <AccordionItem>
      <h5 slot="header">How does {INSTANCE_CONFIG.title} access your data?</h5>
      <p class="info-paragraph">
        You can access your health data from health care providers, insurance companies, and others, using rights you have as a patient and consumer. For example, in the U.S., the federal 21st Century Cures Act gives you the right to an electronic copy of your health care provider’s patient record, and many state public health agencies make immunization and other data available to state residents. We are working on new sources of information, such as insurance company data, as laws and policies change to give individuals the right to computerized access using data standards. {INSTANCE_CONFIG.title} lets you access your information, gather it in one place, add what you feel is important, and share summaries of your health data as you see fit.
      </p>
    </AccordionItem>
    <AccordionItem>
      <h5 slot="header">How did {INSTANCE_CONFIG.title} begin?</h5>
      <p class="info-paragraph">
        {INSTANCE_CONFIG.title} builds on the ideas and technologies of WA State Deparment of Health's WA Verify program that began in 2021, which made it easy for people receiving COVID-19 vaccinations in Washington State to access and share that information digitally, using SMART Health Card (SHC) QR codes. WA Verify was used by nearly two million people from 2021-2023.
      </p>

      <p class="info-paragraph">
        Now, using SMART Health Links (SHLs), {INSTANCE_CONFIG.title} lets WA State residents access, augment, and electively share their own health data using the International Patient Summary (IPS) standard. They might choose to do so to verify immunizations, to summarize traveler health information, to have a medical summary in the event they require urgent or emergency care, or for routine sharing of their full history with others.
      </p>
    </AccordionItem>
    <AccordionItem>
      <h5 slot="header">What is the International Patient Summary?</h5>
      <p class="info-paragraph">
        The International Patient Summary (IPS) is a standardized set of basic clinical data that includes important clinical history, medications, immunizations, advance directives, and other data vital for health care. This data may be helpful to those traveling, to parents or caregivers, and to anyone who wants to be able to see their own records, or to securely share their data with healthcare providers or others of their choosing. {INSTANCE_CONFIG.title} uses the secure, patient-controlled SMART Health Link (SHL) standard to allow people to share information collected and stored on their behalf by the Washington State Department of Health.
      </p>
    </AccordionItem>
  </Accordion>
</Row>
