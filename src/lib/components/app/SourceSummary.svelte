<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { getContext } from 'svelte';
  import {
    Col,
    Card,
    CardBody,
    Row,
    Spinner
  } from '@sveltestrap/sveltestrap';
  import type {
    DataFormConfig
  } from '$lib/utils/types';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import SourcePill from '$lib/components/app/SourcePill.svelte';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
  import {derived, type Writable } from 'svelte/store';
  
  const colorMap = getContext<Writable<Map<string, string>>>('colorMap');

  let className = '';
  export { className as class };

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let masterPatient;
  $: masterPatient = fhirDataService.masterPatient;
  let userResources;
  $: userResources = fhirDataService.userResources;
  let loading;
  $: loading = fhirDataService.loading;
  let fetchError = "";
  let sections: Array<{
    id: string;
    title?: string;
    description?: string;
    category: string;
    forms: DataFormConfig[]
  }> = INSTANCE_CONFIG.pages.data.sections;

  let collectionInfo: Array<{sourceName: string, category: string, method: string, source: string}> | undefined;
  let displaySourceNames = derived(colorMap, ($colorMap) => {
    return Array.from($colorMap.keys());
  });

  $: if (collectionInfo) {
    tick().then(checkOverflow);
  }

  function showError(message: string) {
    fetchError = message;
  }

  let categoryStatuses: Array<boolean | undefined> = sections.map(s => undefined);
  function updateStatus(detail: {index: number, status: boolean | undefined}) {
    categoryStatuses[detail.index] = detail.status;
    categoryStatuses = categoryStatuses;
  }

  let expanded = false;
  let scrollRow: HTMLElement;
  let isOverflowing = false;
  let resizeObserver: ResizeObserver;
  
  function checkOverflow() {
    if (scrollRow) {
      isOverflowing = scrollRow.scrollWidth > scrollRow.clientWidth;
    }
  }

  $: if (scrollRow) {
    checkOverflow();
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(scrollRow);
  }
  
  let overlayScrollbars = hasOverlayScrollbars();
  onMount(() => {
    return () => resizeObserver?.disconnect();
  });

  let scrollLeft = 0;
  
  function handleScroll() {
    scrollLeft = scrollRow.scrollLeft;
  }

  function hasOverlayScrollbars(): boolean {
    const el = document.createElement('div');
    el.style.cssText = 'width:100px;overflow-x:scroll;';
    document.body.appendChild(el);
    const overlaid = el.offsetHeight === el.scrollHeight;
    document.body.removeChild(el);
    return overlaid;
  }
</script>

{#if $displaySourceNames}
  <Card class={"bg-light " + className }>
    <CardBody class="p-2">
    {#if $loading}
      <Row>
        <Col class="d-flex justify-content-center">
          <Spinner color="secondary"/>
        </Col>
      </Row>
    {:else if expanded}
      <!-- Expanded: wrap view -->
      <Row class="g-1 mb-2">
        {#each $displaySourceNames as source, index}
          <Col class="col-auto">
            <SourcePill name={source} color={$colorMap.get(source)} />
          </Col>
        {/each}
      </Row>
      <div class="d-flex justify-content-end">
        <button class="collapse-btn" on:click={() => { expanded = false; scrollLeft = 0 }}>Collapse</button>
      </div>
    {:else}
      <!-- Collapsed: single scrollable row with "See all" overlay -->
      <div class="scroll-row-wrapper">
        <div class="scroll-row" class:has-overflow={isOverflowing} class:scrollbar-overlay={overlayScrollbars} bind:this={scrollRow} on:scroll={handleScroll}>
          {#each $displaySourceNames as source, index}
            <div class="pill-col">
              <SourcePill name={source} color={$colorMap.get(source)} />
            </div>
          {/each}
        </div>
        {#if scrollLeft > 0}
          <div class="see-start-overlay" class:scrollbar-overlay={overlayScrollbars}></div>
        {/if}
        {#if isOverflowing}
          <button class="see-all-overlay" class:scrollbar-overlay={overlayScrollbars} on:click={() => expanded = true}>See all</button>
        {/if}
      </div>
    {/if}
    </CardBody>
  </Card>
{/if}

<style>
  .scroll-row-wrapper {
    position: relative;
    overflow: hidden;
  }

  .scroll-row {
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 0.25rem;
    scrollbar-width: thin; /* Firefox */
  }

  .scroll-row.has-overflow {
    padding-right: 70px;
    padding-bottom: 0rem;
  }
  .scroll-row.has-overflow.scrollbar-overlay {
    padding-bottom: 0.8rem;
  }

  .pill-col {
    flex: 0 0 auto;
  }

  .see-all-overlay {
    position: absolute;
    right: 0;
    top: 0;
    height: calc(100% - 0.6rem);
    width: 80px;
    background: linear-gradient(to right, transparent, var(--bs-light) 40%);
    border: none;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 500;
    color: #555;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 0.5rem;
  }
  .see-all-overlay.scrollbar-overlay {
    height: calc(100% - 0.6rem);
  }


  .see-start-overlay {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 1rem;
    background: linear-gradient(to left, transparent, var(--bs-light) 100%);
    pointer-events: none; /* so it doesn't block scrolling or clicks */
  }

  .collapse-btn {
    background: none;
    border: 1px solid #ccc;
    border-radius: 20px;
    padding: 2px 16px;
    font-size: 0.8rem;
    font-weight: 500;
    color: #555;
    cursor: pointer;
  }

  @media (hover: hover) {
    .see-all-overlay:hover {
      color: #000;
    }
    
    .collapse-btn:hover {
      background-color: #f0f0f0;
    }
  }
</style>