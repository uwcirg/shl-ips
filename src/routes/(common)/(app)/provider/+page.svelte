<script lang="ts">
  import {
    Col,
    Row
  } from '@sveltestrap/sveltestrap';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import ProviderOverview from '$lib/components/app/ProviderOverview.svelte';

  let component = INSTANCE_CONFIG.pages?.provider?.component ?? ProviderOverview;
</script>

<svelte:head>
  <title>Patients - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

<Row>
  <p>
    Welcome to {INSTANCE_CONFIG.title}, the Washington State Department of Health's platform
    for creating and sharing your personal health summaries.
  </p>
</Row>
<Row>
  <Col>
    <svelte:component this={component} />
  </Col>
</Row>
