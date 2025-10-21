<script lang="ts">
  import {
    Button,
    Col,
    Icon,
    Row
  } from 'sveltestrap';
  import HealthLinkOverview from '$lib/components/app/HealthLinkOverview.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
</script>

<svelte:head>
  <title>My Summaries - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

<div class="px-3">
  <Row>
    <h4> My Shareable Health Summaries</h4>
    <p>
      Health Summaries that you have created and shared with others are displayed here. Start creating a new shareable health summary by clicking the button below, or select a summary to view details about it, make changes, or delete it.
    </p>
  </Row>
<Row class="d-flex justify-content-center mb-4">
  <Col md="10">
    <Button color="success" style="width:100%" href={'/share'}>
      <b><Icon name="plus-lg" /></b> New Sharable Health Summary
    </Button>
  </Col>
</Row>
  <Row>
    <Col>
      <HealthLinkOverview />
    </Col>
  </Row>
</div>
