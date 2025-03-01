<script lang="ts">
  import {
    Col,
    Row,
    Styles
  } from 'sveltestrap';
  import HealthLinkOverview from '$lib/components/app/HealthLinkOverview.svelte';
</script>
<Styles />
<svelte:head>
    <title>Home - WA Verify+</title> 
</svelte:head>

<div class="px-3">
  <Row>
    <p>
      Welcome to WA Verify+, the Washington State Department of Health's platform
      for creating and sharing your personal health summaries.
    </p>
  </Row>
  <Row>
    <Col>
      <HealthLinkOverview />
    </Col>
  </Row>
</div>
