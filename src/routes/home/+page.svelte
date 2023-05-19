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
	<h1 style="font-size: 38px; font-weight: 200; font-family: Verdana, sans-serif; color: rgb(200, 76, 14); margin: 30px 0px;">WA Verify<sup>+</sup> International Patient Summary</h1>
	<span style="font-size: 18px; font-weight: 200; font-family: Verdana, sans-serif; margin: 50px 0px;">
		<p>Welcome to a demonstration of WA State’s ability to allow individuals in WA State to share their health data, including state immunization records.
		</p>

		<p>The WA Verify<sup>+</sup> system builds on the WA Verify vaccination verification system to allow people to access and share their own health data, stored for them by the Washington State Department of Health, including immunizations, advance directives, and other data specified by the International Patient Summary. This data may be helpful to those traveling away from home, to parents and caregivers, and to anyone who wants to be able to see their own records, or securely share their data with healthcare providers or others of their choosing.
		</p>

		<p>WA Verify<sup>+</sup> uses the secure, patient-controlled SMART Health Link standard. If you would like to share your records, you may use either the electronic or a printed version of the QR Code you’ll get from the system. We recommend waiting 3-7 days for any new immunization to show up in the State system, and therefore be available in this International Patient Summary.</p>

		<p>You can start by entering a name, date of birth and cell phone number to generate a QR Code to access your records. You will receive a code on your cell phone which you will need to enter each time you sign in.</p>
	</span>
</div>
<Row style="padding: 0px 17px">
  <Col style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgb(204, 204, 204);">
    <HealthLinkOverview />
  </Col>
</Row>
