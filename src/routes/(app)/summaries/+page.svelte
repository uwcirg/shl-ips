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

<Row>
  <h4> My Shareable Health Summaries</h4>
  <p>
    Shareable Health Summaries that you have created from your data to share with others are displayed here. Start creating a new Summary by clicking the button below, or select a summary to view details about it, make changes, or delete it.
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
