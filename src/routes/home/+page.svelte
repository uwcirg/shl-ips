<script lang="ts">
  import { goto } from '$app/navigation';
  import type { SHLAdminParams, SHLClient } from '$lib/managementClient';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';
  import HealthLinkOverview from '$lib/HealthLinkOverview.svelte';
  import {
    Dropdown,
    Col,
    Collapse,
    Container,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Icon,
    Image,
    Nav,
    Navbar,
    NavbarBrand,
    NavItem,
    NavLink,
    NavbarToggler,
    Row,
    Styles,

    Button

  } from 'sveltestrap';
</script>
<Styles />
<div style="padding-left: 17px">
  <span style="font-size: 18px; font-weight: 200; font-family: Verdana, sans-serif; margin: 50px 0px;">
    <p class="text-danger">Test System - no protected health information</p>

    <p>The WA Verify<sup>+</sup> system enhances the WA Verify COVID-19 vaccination verification system which, since 2021, has allowed people receiving COVID-19 vaccinations in Washington State to access and share that information using SMART Health Card QR codes.</p>


  <p>WA Verify<sup>+</sup> WA allows people to access augment, and electively share their own Intternational Patient Summaries (IPS), a richer set of health information collected and stored on their behalf by the Washington State Department of Health. IPS data include critical clinical data, immunizations, advance directives, and other data needed for urgent medical care. This data may be helpful to those traveling away from home, to parents and caregivers, and to anyone who wants to be able to see their own records, or securely share their data with healthcare providers or others of their choosing.  WA Verify<sup>+</sup> uses the secure, patient-controlled SMART Health Link (SHL) standard. </p>

    <p>This system generates QR codes and links to demonstration the ability of WA Verify<sup>+</sup> to facilitate sharing directly controlled by individuals. You can see a list of SHLs generated <i>on this device</i>, as well as generate a new one.</p> 
  </span>
</div>
<Row style="padding: 0px 17px">
  <Col style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgb(204, 204, 204);">
    <HealthLinkOverview />
  </Col>
</Row>
