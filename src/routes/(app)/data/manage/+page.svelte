<script lang="ts">
  import DataSummary from '$lib/components/app/DataSummary.svelte';
  import ManageData from '$lib/components/app/ManageData.svelte';
  import SourceSummary from '$lib/components/app/SourceSummary.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import {
    TabContent,
    TabPane
  } from '@sveltestrap/sveltestrap';
</script>

<svelte:head>
  <title>Review - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

<h4>Review Health Data</h4>
<p>
  View and manage your imported health data.
</p>
<TabContent>
  <TabPane tabId="data" active class="p-3">
    <span slot="tab">My Health Data</span>
    <h6>Your Sources:</h6>
    <SourceSummary class="mb-3"/>
    <DataSummary />
  </TabPane>
  <TabPane tabId="sources" class="p-3">
    <span slot="tab">My Imports</span>
    <ManageData />
  </TabPane>
</TabContent>
