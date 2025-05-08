<script lang="ts">
  import {
    Col,
    Row,
    Styles
  } from 'sveltestrap';
  import HealthLinkOverview from '$lib/components/app/HealthLinkOverview.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
</script>
<Styles />
<svelte:head>
    <title>My Summaries - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

<div class="px-3">
  <Row>
    <p>
      Welcome to WA Health Summary, the Washington State Department of Health's platform
      for creating and sharing your personal health summaries.
    </p>
  </Row>
  <Row>
    <Col>
      <HealthLinkOverview />
    </Col>
  </Row>
</div>
