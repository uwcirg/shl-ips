<script lang="ts">
  import {
    Accordion,
    AccordionItem,
    Button,
    Card,
    CardBody,
    Row,
    Styles
  } from 'sveltestrap';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { AuthService } from '$lib/utils/AuthService';

  onMount(() => goto('https://myhealthsummary.demo.cirg.uw.edu'));

  async function login() {
    if (await AuthService.Instance.isAuthenticated()) {
      goto('/summaries');
    } else {
      AuthService.Instance.login();
    }
  }
</script>
<Styles />
<svelte:head>
    <title>WA Health Summary</title>
</svelte:head>

<div style="padding-left: 17px">
  <span style="margin: 50px 0px;">
    <p class="text-danger info-paragraph">Demonstration/Test System - do not use with real health information</p>
  </span>

    <p class="info-paragraph">WA Health Summary lets people obtain and personally control the sharing of their health information, with any health care provider, family member or other individuals of their choosing, using a simple web link or QR code.</p>
  <Row class="my-4 d-flex justify-content-center">
    <Card style="width: 60%" color="light">
      <CardBody>
        <Row class="d-flex justify-content-center">
          <Button
            color="primary"
            size="lg"
            on:click={ () => login() }
          >
            Get Started
          </Button>
        </Row>
      </CardBody>
    </Card>
  </Row>
  <Row>
    
<Accordion>
  <AccordionItem>
    <h5 slot="header">How does this work?</h5>
    <p class="info-paragraph">We use the SMART Health Links and International Patient Summary standards to make this feasible, verifiable, and secure. In the U.S., the federal 21st Century Cures Act gives all residents the right to an electronic copy of their health information. WA Health Summary lets you access that information and share it as you see fit, building on the ideas and technologies of the WA Verify COVID-19 vaccination verification system, which was used by almost two million people from 2021-2023.</p>
  </AccordionItem>
  <AccordionItem>
    <h5 slot="header">How did WA Health Summary begin?</h5>
    <p class="info-paragraph">Since 2021, WA Verify has made it easy for people receiving COVID-19 vaccinations in Washington State to access and share that information using SMART Health Card QR codes.</p>
      
    <p class="info-paragraph">Now, using SMART Health Links, WA Health Summary is exploring personally-controlled access to and sharing of health data by WA State residents to meet needs such as travel, emergency records access, school enrollment, etc.</p>

    <p class="info-paragraph">WA Health Summary allows people to access, augment, and electively share their own health data using the International Patient Summary (IPS) standard. They might choose to do so to verify immunizations, to summarize traveler health information, to have a medical summary in the event they require urgent or emergency care, or for routine sharing of their full history with others.</p>
  </AccordionItem>
  <AccordionItem>
    <h5 slot="header">What is the International Patient Summary?</h5>
    <p class="info-paragraph">IPS information includes important clinical history, medications, immunizations, advance directives, and other data vital for health care. This data may be helpful to those traveling, to parents or caregivers, and to anyone who wants to be able to see their own records, or securely share their data with healthcare providers or others of their choosing. WA Health Summary uses the secure, patient-controlled SMART Health Link (SHL) standard to allow people to share information collected and stored on their behalf by the Washington State Department of Health.</p>
  </AccordionItem>
</Accordion>
  </Row>
</div>

<style>
  .info-paragraph {
    font-size: 16px;
    font-weight: 200;
    font-family: Verdana, sans-serif;
  }
</style>
