<script lang="ts">
  import {
    Col,
    Row
  } from 'sveltestrap';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import ProviderOverview from '$lib/components/app/ProviderOverview.svelte';

  let component = INSTANCE_CONFIG.pages?.provider?.component ?? ProviderOverview;
</script>

<svelte:head>
  <title>Patients - {INSTANCE_CONFIG.title}</title> 
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
      <svelte:component this={component} />
    </Col>
  </Row>
</div>
