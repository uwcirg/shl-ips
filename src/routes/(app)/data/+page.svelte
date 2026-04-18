<script lang="ts">
  import {
    Breadcrumb,
    BreadcrumbItem,
    Col,
    Row
  } from '@sveltestrap/sveltestrap';
  import { getContext, onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AddDataset from '$lib/components/app/AddDataset.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import type { FHIRDataService } from '$lib/utils/fhirDataService';
  import StickyNavConfig from '$lib/components/layout/StickyNavConfig.svelte';

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let patient = fhirDataService.patient;

  onMount(async () => {
    
  })
</script>


<svelte:head>
  <title>Add Data - {INSTANCE_CONFIG.title}</title> 
</svelte:head>

<Breadcrumb divider="❯">
  <BreadcrumbItem active>Add/Import</BreadcrumbItem>
  <BreadcrumbItem><a href="/data/manage">Review</a></BreadcrumbItem>
  <BreadcrumbItem><a href="/summaries">Share</a></BreadcrumbItem>
</Breadcrumb>

<AddDataset />

<StickyNavConfig
  showBack={false}
  showForward={true}
  forwardLabel="Review your data"
  onForward={() => goto(`/data/manage`)}
/>