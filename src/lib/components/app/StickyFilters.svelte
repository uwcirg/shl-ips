<script lang="ts">
  import { getContext, onDestroy, onMount } from 'svelte';
  import { readable, type Readable } from 'svelte/store';
  import CompactFilterBar from '$lib/components/app/CompactFilterBar.svelte';
  import type { createCategorizedStore } from '$lib/stores/categorizedResources';
  import type { ResourceFilterStore } from '$lib/stores/resourceFilters';
  import type { IAuthService } from '$lib/utils/types';

  // Floats the compact filter controls at the top left of the viewport once the page has scrolled
  // past the main filter bar, whether or not a section nav is beside the content. Put it as the
  // first child of a block that spans the whole list: it sticks to the top of the viewport until
  // that block ends. It is a zero-height anchor, so it takes no layout space of its own.
  export let filters: ResourceFilterStore;
  export let categorizedStore: ReturnType<typeof createCategorizedStore>;
  export let showSections = true;
  // Whether a section nav column sits below, so the compact bar can fill the space above it
  export let withNav = false;
  // True while the anchor is stuck, i.e. the compact controls are showing
  export let stuck = false;

  // When signed in, the app shows a floating tab bar over the top of the viewport while scrolling
  // (same condition as in Header and SectionNav), so the anchor sticks below it. The bar only
  // exists from sm up; keep the breakpoint in the CSS below in step with Header.
  const authService = getContext<IAuthService | undefined>('authService');
  const authenticated: Readable<boolean> = authService?.authenticated ?? readable(false);
  const user = authService?.user ?? readable(null);
  $: signedIn = !!($authenticated && $user);

  let anchor: HTMLElement;
  let open = false;
  let frame = 0;

  // A sticky element sits at its `top` offset exactly while it is stuck, and below it otherwise
  function updateStuck() {
    if (!anchor) return;
    const top = parseFloat(getComputedStyle(anchor).top);
    stuck = !Number.isNaN(top) && anchor.getBoundingClientRect().top <= top + 0.5;
  }

  function scheduleUpdate() {
    if (frame || typeof requestAnimationFrame === 'undefined') return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      updateStuck();
    });
  }

  // Scrolling back up to the main filter bar closes the dropdown, so the same controls aren't
  // showing twice
  $: if (!stuck && open) open = false;

  // Filtering can shorten the list, which would shrink the page, clamp the scroll position and
  // unstick the anchor (closing the dropdown) while the user is still picking filters. Holding the
  // list's height while the dropdown is open means only the user's own scrolling can unstick it.
  let heldParent: HTMLElement | undefined;
  function holdHeight(hold: boolean) {
    if (hold && !heldParent && anchor?.parentElement) {
      heldParent = anchor.parentElement;
      heldParent.style.minHeight = `${heldParent.offsetHeight}px`;
    } else if (!hold && heldParent) {
      heldParent.style.minHeight = '';
      heldParent = undefined;
    }
  }
  $: holdHeight(open);
  onDestroy(() => holdHeight(false));

  onMount(() => {
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();
    return () => {
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      if (frame) cancelAnimationFrame(frame);
    };
  });
</script>

<div class="sticky-filters-anchor" class:signed-in={signedIn} bind:this={anchor}>
  {#if stuck}
    <!-- Spans the content width but lets clicks through where it is empty -->
    <div class="sticky-filters">
      <CompactFilterBar {filters} {categorizedStore} {showSections} {withNav} bind:open />
    </div>
  {/if}
</div>

<style>
  .sticky-filters-anchor {
    /* Space the floating app tab bar takes at the top of the viewport while scrolling */
    --filters-overlay: 0px;
    position: sticky;
    top: calc(var(--filters-overlay) + 1rem);
    height: 0;
    /* Above the page content, below the app tab bar (1030) */
    z-index: 1020;
  }
  @media (min-width: 576px) {
    .sticky-filters-anchor.signed-in {
      --filters-overlay: var(--header-height, 64px);
    }
  }
  .sticky-filters {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    pointer-events: none;
  }
</style>
