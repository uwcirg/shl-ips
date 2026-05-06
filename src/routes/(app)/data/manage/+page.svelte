<script lang="ts">
  import { goto } from '$app/navigation';
  import ManageData from '$lib/components/app/ManageData.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import StickyNavConfig from '$lib/components/layout/StickyNavConfig.svelte';
</script>


<svelte:head>
  <title>Review - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

<h4>Review Health Data</h4>
<p>
  View and manage your imported health data.
</p>
<ManageData />

<StickyNavConfig
  showBack={true}
  backLabel="Add more data"
  onBack={() => goto(`/data`)}
  showForward={true}
  forwardLabel="Your Summaries"
  onForward={() => goto(`/summaries`)}
/>