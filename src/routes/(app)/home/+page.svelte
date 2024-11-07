<script lang="ts">
  import HealthLinkOverview from '$lib/HealthLinkOverview.svelte';
  import {
      Accordion,
      AccordionItem,
    Col,
    Row,
    Styles,

  } from 'sveltestrap';
</script>
<Styles />
<svelte:head>
    <title>Home - WA Verify+</title> 
</svelte:head>

<div style="padding-left: 17px">
  <span style="font-size: 16px; font-weight: 200; font-family: Verdana, sans-serif; margin: 50px 0px;">
    <p class="text-danger">Demonstration/Test System - do not use with real health information</p>

    <p>WA Verify<sup>+</sup> lets people obtain and personally control the sharing of their health information, with any health care provider, family member or other individuals of their choosing, using a simple web link or QR code.</p>
    
    <p>We use the SMART Health Links and International Patient Summary standards to make this feasible, verifiable, and secure. In the U.S., the federal 21st Century Cures Act gives all residents the right to an electronic copy of their health information. WA Verify<sup>+</sup> lets you access that information and share it as you see fit, building on the ideas and technologies of the WA Verify COVID-19 vaccination verification system, which was used by almost two million people from 2021-2023.</p>
  </span>
  <Row>
    <Col>
      <HealthLinkOverview />
    </Col>
  </Row>
  <Accordion>
    <AccordionItem>
  <h5 slot="header">More About WA Verify<sup>+</sup></h5>
  <span style="font-size: 16px; font-weight: 200; font-family: Verdana, sans-serif; margin: 50px 0px;">
    <p>Since 2021, WA Verify has made it easy for people receiving COVID-19 vaccinations in Washington State to access and share that information using SMART Health Card QR codes.</p>
      
    <p>Now, using SMART Health Links, WA Verify<sup>+</sup> is exploring personally-controlled access to and sharing of health data by WA State residents to meet needs such as travel, emergency records access, school enrollment, etc.</p>

    <p>WA Verify<sup>+</sup> allows people to access, augment, and electively share their own health data using the International Patient Summary (IPS) standard. They might choose to do so to verify immunizations, to summarize traveler health information, to have a medical summary in the event they require urgent or emergency care, or for routine sharing of their full history with others.</p>

    <p>IPS information includes important clinical history, medications, immunizations, advance directives, and other data vital for health care. This data may be helpful to those traveling, to parents or caregivers, and to anyone who wants to be able to see their own records, or securely share their data with healthcare providers or others of their choosing. WA Verify<sup>+</sup> uses the secure, patient-controlled SMART Health Link (SHL) standard to allow people to share information collected and stored on their behalf by the Washington State Department of Health.</p>

    <p>This system generates QR codes and links that demonstrate the ability of WA Verify<sup>+</sup> to facilitate personally-controlled sharing of health records. On this page, you can view listed SHLs previously generated <em>on this device</em>, and you can generate a new SHL.</p>

  </span>
</AccordionItem>
</Accordion>
</div>