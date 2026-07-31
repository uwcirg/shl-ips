<script lang="ts">
  import DataSummary from '$lib/components/app/DataSummary.svelte';
  import SourceSummary from '$lib/components/app/SourceSummary.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import { goto } from '$app/navigation';
  import { Row, Col, Button, Icon } from '@sveltestrap/sveltestrap';

  import { page } from '$app/stores';

  let category = $page.params.type;
</script>

<svelte:head>
  <title>Review - {INSTANCE_CONFIG.title}</title> 
</svelte:head>
<Row class="mb-3">
  <Col>
    <Button size="sm" color="secondary" outline on:click={() => goto(`/data/manage#${category}`)}><Icon name="chevron-left" /> Back to all data</Button>
  </Col>
</Row>
<h4>Review {category}</h4>
<h6>Your Sources:</h6>
<SourceSummary class="mb-3"/>
<DataSummary categories={[category]}/>