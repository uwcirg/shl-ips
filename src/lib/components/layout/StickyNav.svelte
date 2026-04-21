<!-- StickyNav.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Button, Row, Col } from '@sveltestrap/sveltestrap';
  export let backLabel: string = 'Back';
  export let forwardLabel: string = 'Next';
  export let showBack: boolean = false;
  export let showForward: boolean = false;
  export let onBack: () => void = () => {};
  export let onForward: () => void = () => {};

  const NAV_HEIGHT = 63; // The height of the nav, so that the static/fixed transition happens at the right place

  let footerVisible = false;
  let sentinel: HTMLElement;

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { footerVisible = entry.isIntersecting; },
      {
        threshold: 0,
        // Shrink the bottom of the root viewport inward by the nav height.
        // The sentinel is now considered "intersecting" only when it reaches
        // the imaginary line where the top of the fixed nav sits.
        rootMargin: `0px 0px -${NAV_HEIGHT}px 0px`,
      }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  });
</script>

<div bind:this={sentinel} class="sticky-nav-sentinel" aria-hidden="true"></div>
{#if showBack || showForward}
  <div class="sticky-nav {footerVisible ? 'sticky-nav--docked' : 'sticky-nav--fixed'}">
    <Row class="align-items-center">
      <Col class="text-start">
        {#if showBack}
          <Button color="secondary" on:click={onBack}>{backLabel}</Button>
        {/if}
      </Col>
      <Col class="text-end">
        {#if showForward}
          <Button color="primary" on:click={onForward}>{forwardLabel}</Button>
        {/if}
      </Col>
    </Row>
  </div>
{/if}

<style lang="scss">
  .sticky-nav-sentinel {
    height: 0;
  }

  .sticky-nav {
    width: 100%;
    background: white;
    border-top: 1px solid #dee2e6;
    padding: 0.75rem 1rem;
    z-index: 1000;

    &--fixed {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
    }

    &--docked {
      position: static;
    }
  }
</style>