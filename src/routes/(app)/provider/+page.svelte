<script lang="ts">
  import {
    Col,
    Row,
    Styles
  } from 'sveltestrap';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import ProviderOverview from '$lib/components/app/ProviderOverview.svelte';

  let component = INSTANCE_CONFIG.pages?.provider?.component ?? ProviderOverview;
  let title = INSTANCE_CONFIG.pages?.provider?.title ?? `Patients - ${INSTANCE_CONFIG.title}`;
</script>
<Styles />
<svelte:head>
    <title>{title}</title> 
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
