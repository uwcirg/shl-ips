<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { Card, CardBody, Col, Row, Spinner } from '@sveltestrap/sveltestrap';

  let className = '';
  export { className as class };

  export let loading = false;
  // Changes whenever the pills change, so overflow is re-measured
  export let watch: unknown = undefined;

  // Pills (any elements) go in the default slot: one scrollable line, expandable to wrap
  let expanded = false;
  let scrollRow: HTMLElement;
  let isOverflowing = false;
  let resizeObserver: ResizeObserver;

  function checkOverflow() {
    if (scrollRow && !expanded) {
      isOverflowing = scrollRow.scrollWidth > scrollRow.clientWidth;
    }
  }

  $: if (scrollRow) {
    checkOverflow();
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(scrollRow);
  }
  $: watch, tick().then(checkOverflow);

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

<Card class={"bg-light " + className}>
  <CardBody class="p-2">
    {#if loading}
      <Row>
        <Col class="d-flex justify-content-center">
          <Spinner color="secondary" />
        </Col>
      </Row>
    {:else}
      <div class="scroll-row-wrapper">
        <div
          class="scroll-row"
          class:expanded
          class:has-overflow={isOverflowing && !expanded}
          class:scrollbar-overlay={overlayScrollbars}
          bind:this={scrollRow}
          on:scroll={handleScroll}
        >
          <slot />
        </div>
        {#if !expanded && scrollLeft > 0}
          <div class="see-start-overlay" class:scrollbar-overlay={overlayScrollbars}></div>
        {/if}
        {#if !expanded && isOverflowing}
          <button class="see-all-overlay" class:scrollbar-overlay={overlayScrollbars} on:click={() => (expanded = true)}>See all</button>
        {/if}
      </div>
      {#if expanded}
        <div class="d-flex justify-content-end mt-2">
          <button class="collapse-btn" on:click={() => { expanded = false; scrollLeft = 0; tick().then(checkOverflow); }}>Collapse</button>
        </div>
      {/if}
    {/if}
  </CardBody>
</Card>

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

  /* Pills are slotted in as direct children, so their sizing is set from here */
  .scroll-row > :global(*) {
    flex: 0 0 auto;
  }

  .scroll-row.expanded {
    flex-wrap: wrap;
    overflow-x: visible;
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
    height: calc(100% - 0.8rem);
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