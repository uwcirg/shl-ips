<script lang="ts">
  import { Spinner } from '@sveltestrap/sveltestrap';
  import { fade } from 'svelte/transition';

  // Keeps what it wraps visible but dimmed and out of reach while `active`, with a message and
  // spinner over it. Used on forms that are pre-filled from saved data, so nobody starts typing
  // into a form that is about to be replaced.
  export let active = false;
  export let label = 'Loading your data...';
  export let detail = '';

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
</script>

<div class="loading-state position-relative">
  <!-- inert removes it from the tab order and the accessibility tree, and blocks clicks and typing -->
  <div class="loading-content" class:dimmed={active} inert={active ? true : undefined} aria-busy={active}>
    <slot />
  </div>
  {#if active}
    <div class="loading-overlay" role="status" transition:fade={{ duration: reduceMotion ? 0 : 200 }}>
      <div class="loading-message shadow">
        <Spinner color="primary" type="border" />
        <div>
          <div class="fw-semibold">{label}</div>
          {#if detail}<div class="small text-secondary">{detail}</div>{/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .loading-content {
    transition: opacity 0.2s ease;
  }
  .loading-content.dimmed {
    opacity: 0.45;
    user-select: none;
  }
  .loading-overlay {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 4rem;
    cursor: progress;
  }
  .loading-message {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius-lg);
    background: var(--bs-body-bg);
    /* Stays in view on a tall form while the page scrolls */
    position: sticky;
    top: 6rem;
    height: fit-content;
  }
  @media (prefers-reduced-motion: reduce) {
    .loading-content { transition: none; }
  }
</style>
