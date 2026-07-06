<script lang="ts">
  import DataSummary from '$lib/components/app/DataSummary.svelte';
  import ManageData from '$lib/components/app/ManageData.svelte';
  import SourceSummary from '$lib/components/app/SourceSummary.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import {
    TabContent,
    TabPane
  } from '@sveltestrap/sveltestrap';

  import { page } from '$app/stores';

  let category = $page.params.type;
</script>

<svelte:head>
  <title>Review - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

<h4>Review {category} Data</h4>
<h6>Your Sources:</h6>
<SourceSummary class="mb-3"/>
<DataSummary categories={[category]}/>