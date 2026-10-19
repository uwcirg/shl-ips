<script context="module" lang="ts">
  export interface SectionNavItem {
    title: string;
    // The element a click scrolls to. Leave unset until it exists (e.g. before mount); items
    // without an element are listed but do nothing.
    element?: HTMLElement | null;
    // Shown beside the title when defined. Leave undefined for no count.
    count?: number;
  }
</script>

<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { readable, type Readable } from 'svelte/store';
  import type { IAuthService } from '$lib/utils/types';

  // A table of contents for a long page: lists sections, highlights the one in view, and jumps
  // to one on click. Meant to sit in a column beside the content (from md up it sticks below the
  // app's header; below md it is hidden, since mobile navigation is a separate piece).
  //
  //   <SectionNav sections={[{ title: 'Medications', element: medsEl, count: 4 }, ...]} />
  //
  // Navigation never touches the URL: the page's fragment may carry other state (e.g. a SHL), so
  // entries are buttons that scroll the window, not #anchor links.
  export let sections: SectionNavItem[] = [];
  export let label = 'Sections';

  // --- Offsets ------------------------------------------------------------------------------
  // When signed in, the app shows a floating tab bar over the top of the viewport while scrolling
  // (same condition as in Header), so the sticky nav and jumps need to clear it. It only exists
  // from sm up (signed-in phones get a bottom bar instead); keep this in step with the CSS below.
  const FLOATING_NAV_MIN_WIDTH = 576;
  const JUMP_CLEARANCE_REM = 1.25;

  const authService = getContext<IAuthService | undefined>('authService');
  const authenticated: Readable<boolean> = authService?.authenticated ?? readable(false);
  const user = authService?.user ?? readable(null);
  $: signedIn = !!($authenticated && $user);

  // Px the floating tab bar covers at the top of the viewport right now
  function overlayHeight(): number {
    if (!signedIn || window.innerWidth < FLOATING_NAV_MIN_WIDTH) return 0;
    const header = getComputedStyle(document.documentElement).getPropertyValue('--header-height');
    return parseFloat(header) || 64;
  }

  // Px from the top of the viewport at which a jump lands its element
  function jumpOffset(): number {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return overlayHeight() + JUMP_CLEARANCE_REM * rootFontSize;
  }

  // --- Active section (scroll-spy) --------------------------------------------------------
  let activeElement: HTMLElement | null | undefined;
  $: if (!sections.some(({ element }) => element && element === activeElement)) {
    activeElement = sections.find(({ element }) => element)?.element;
  }

  // The active section is the last one (in list order) whose top has reached the spy line, a
  // fixed fraction of the way down the viewport. Every element switches at that same line, whatever
  // the size of its neighbours (a rule like "first one visible in the top part of the screen"
  // makes a short section hold the highlight until it scrolls off, so the switch happens at
  // a different place for each section).
  //
  // The line is never above where a jump lands an element, so a section you just jumped to counts
  // as reached. Near the end of the page it slides down to the bottom edge: the page runs out of
  // scroll, so the last (short) sections could otherwise never get their tops up to the line. The
  // slide is gradual, so the active section can't flip back and forth as you scroll.
  //
  // This reads live positions on each scroll frame rather than remembering what an
  // IntersectionObserver last reported: a fast scroll can carry an element past the line between
  // two frames without any event, and remembered state then goes stale.
  const SPY_LINE = 0.40; // fraction of the viewport height, from the top
  const JUMP_SLACK_PX = 8;
  // A jump from the nav keeps its section active while the page scrolls there
  let lockUntil = 0;
  let frame = 0;

  function spyLinePx(): number {
    const viewport = window.innerHeight;
    const base = Math.max(SPY_LINE * viewport, jumpOffset() + JUMP_SLACK_PX);
    const remaining = Math.max(0, document.documentElement.scrollHeight - (window.scrollY + viewport));
    const slideSpan = viewport - base;
    if (slideSpan <= 0) return viewport;
    return base + slideSpan * (1 - Math.min(remaining / slideSpan, 1));
  }

  function updateActive() {
    if (performance.now() < lockUntil) return;
    const line = spyLinePx();
    let reached: HTMLElement | undefined;
    for (const { element } of sections) {
      // Skip elements that aren't rendered (e.g. in a hidden tab), which would read as zero-sized at the top
      if (!element || element.getClientRects().length === 0) continue;
      if (element.getBoundingClientRect().top <= line) reached = element;
    }
    if (reached) activeElement = reached;
  }

  function scheduleUpdate() {
    if (frame || typeof requestAnimationFrame === 'undefined') return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      updateActive();
    });
  }

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

  // Re-evaluate when the list changes (e.g. elements appearing once the page has rendered)
  $: if (sections) scheduleUpdate();

  function jumpTo(element: HTMLElement | null | undefined) {
    if (!element) return;
    activeElement = element;
    lockUntil = performance.now() + 800;
    const top = element.getBoundingClientRect().top + window.scrollY - jumpOffset();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion ? 'auto' : 'smooth' });
    // Move focus with the view so keyboard and screen reader users land on the section: its
    // heading if it has one, else the element itself
    const target = element.querySelector<HTMLElement>('h1, h2, h3, h4, h5, h6') ?? element;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }
</script>

<nav class="section-nav" class:signed-in={signedIn} aria-label={label}>
  <ul class="list-unstyled mb-0">
    {#each sections as { title, element, count }}
      <li>
        <button
          type="button"
          class="section-nav-item"
          class:active={!!element && element === activeElement}
          aria-current={!!element && element === activeElement ? 'true' : undefined}
          on:click={() => jumpTo(element)}
        >
          <span>{title}</span>
          {#if count !== undefined}<span class="section-nav-count">{count}</span>{/if}
        </button>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .section-nav {
    /* Space the floating app tab bar takes at the top of the viewport while scrolling */
    --section-nav-overlay: 0px;
    display: none;
  }
  @media (min-width: 576px) {
    .section-nav.signed-in {
      --section-nav-overlay: var(--header-height, 64px);
    }
  }
  /* Shown from md up; a mobile menu is a separate piece */
  @media (min-width: 768px) {
    .section-nav {
      display: block;
      position: sticky;
      top: calc(var(--section-nav-overlay) + 1rem);
      align-self: start;
      max-height: calc(100vh - var(--section-nav-overlay) - 2rem);
      overflow-y: auto;
    }
  }
  .section-nav-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.4rem 0.65rem;
    border: 0;
    border-left: 3px solid transparent;
    border-radius: 0.375rem;
    background: none;
    color: var(--bs-body-color);
    font-size: 0.9rem;
    text-align: left;
    cursor: pointer;
  }
  .section-nav-item:hover {
    background-color: var(--bs-tertiary-bg, #f8f9fa);
  }
  .section-nav-item.active {
    border-left-color: var(--bs-primary);
    background-color: var(--bs-secondary-bg, #e9ecef);
    font-weight: 600;
  }
  .section-nav-count {
    flex: 0 0 auto;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--bs-secondary-color, #6c757d);
  }
</style>
