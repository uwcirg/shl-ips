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
  // to one on click. From md up it is a column beside the content that sticks below the app's
  // header. Below md it collapses to a small floating pill at the bottom of the viewport showing
  // the section in view (a "you are here" indicator); tapping it opens the full list upward, and
  // picking a section jumps there and collapses it again. On signed-in phones the pill rides
  // just above the app's bottom tab bar.
  //
  //   <SectionNav sections={[{ title: 'Medications', element: medsEl, count: 4 }, ...]} />
  //
  // Navigation never touches the URL: the page's fragment may carry other state (e.g. a SHL), so
  // entries are buttons that scroll the window, not #anchor links.
  export let sections: SectionNavItem[] = [];
  export let label = 'Sections';
  // Leaves room at the top for something floated over it (e.g. the compact filters)
  export let inset = false;

  // --- Offsets ------------------------------------------------------------------------------
  // When signed in, the app shows a floating tab bar over the top of the viewport while scrolling
  // (same condition as in Header), so the sticky nav and jumps need to clear it. It only exists
  // from sm up (signed-in phones get a bottom bar instead); keep this in step with the CSS below.
  const FLOATING_NAV_MIN_WIDTH = 576;
  const JUMP_CLEARANCE_REM = 1.25;
  // Width from which the nav column (and the floated controls beside it) shows; keep in step with
  // the CSS below. Height of the floated controls plus a gap, for narrower screens.
  const NAV_MIN_WIDTH = 768;
  const FLOATING_CONTROLS_REM = 3.5;

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
    // Below md the floated controls sit over the content instead of beside it (see the CSS below)
    const floating = inset && window.innerWidth < NAV_MIN_WIDTH ? FLOATING_CONTROLS_REM : 0;
    return overlayHeight() + (JUMP_CLEARANCE_REM + floating) * rootFontSize;
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

  // Installed as an app (standalone/fullscreen): Header pads the bottom tab bar by 1.5rem (pb-4)
  // there, so it is taller and the pill needs to clear that too. Same check as Header's pwaMode.
  let pwaMode = false;

  onMount(() => {
    pwaMode = window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;
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

  // --- Collapsed (small screen) menu ------------------------------------------------------
  let open = false;
  let pillEl: HTMLElement;
  const menuId = `section-nav-menu-${Math.random().toString(36).slice(2, 8)}`;

  $: activeIndex = sections.findIndex(({ element }) => !!element && element === activeElement);
  $: activeItem = activeIndex >= 0 ? sections[activeIndex] : undefined;

  function onWindowClick(event: MouseEvent) {
    if (open && pillEl && !pillEl.contains(event.target as Node)) open = false;
  }

  function onKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') {
      open = false;
      pillEl?.querySelector<HTMLElement>('.section-nav-toggle')?.focus();
    }
  }

  function select(element: HTMLElement | null | undefined) {
    open = false;
    jumpTo(element);
  }

  // Scrolls to the top of the page; the section in view then updates as the scroll passes
  function scrollToTop() {
    lockUntil = 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  function topFromMenu() {
    open = false;
    scrollToTop();
    pillEl?.querySelector<HTMLElement>('.section-nav-toggle')?.focus({ preventScroll: true });
  }

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

<svelte:window on:click={onWindowClick} on:keydown={onKeydown} />

<nav class="section-nav" class:signed-in={signedIn} class:inset aria-label={label}>
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
  <button type="button" class="section-nav-item section-nav-top" on:click={scrollToTop}>
    <span>Back to top</span>
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" /></svg>
  </button>
</nav>

{#if sections.length > 0}
  <nav
    class="section-nav-pill"
    class:signed-in={signedIn}
    class:pwa={pwaMode}
    class:open
    aria-label={label}
    bind:this={pillEl}
  >
    {#if open}
      <div class="section-nav-menu shadow rounded-4" id={menuId}>
        <ul class="list-unstyled mb-0">
          {#each sections as { title, element, count }}
            <li>
              <button
                type="button"
                class="section-nav-item"
                class:active={!!element && element === activeElement}
                aria-current={!!element && element === activeElement ? 'true' : undefined}
                on:click={() => select(element)}
              >
                <span>{title}</span>
                {#if count !== undefined}<span class="section-nav-count">{count}</span>{/if}
              </button>
            </li>
          {/each}
        </ul>
        <button type="button" class="section-nav-item section-nav-top" on:click={topFromMenu}>
          <span>Back to top</span>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" /></svg>
        </button>
      </div>
    {/if}
    <button
      type="button"
      class="section-nav-toggle shadow rounded-pill"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      on:click={() => (open = !open)}
    >
      <span class="section-nav-current" aria-live="polite">{activeItem?.title ?? label}</span>
      <svg class="section-nav-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l5-5 5 5" /></svg>
    </button>
  </nav>
{/if}


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
  /* Shown from md up; below md the pill takes over */
  @media (min-width: 768px) {
    .section-nav {
      display: block;
      position: sticky;
      top: calc(var(--section-nav-overlay) + 1rem);
      align-self: start;
      max-height: calc(100vh - var(--section-nav-overlay) - 2rem);
      overflow-y: auto;
    }
    /* Height of the floating compact filters plus a gap */
    .section-nav.inset {
      padding-top: 3.5rem;
    }
  }
  /* Below md: the collapsed pill */
  .section-nav-pill {
    /* Clearance above the viewport's bottom edge; signed-in phones add the app's bottom tab bar */
    --section-nav-bottom: 1.75rem;
    position: fixed;
    left: 50%;
    bottom: calc(var(--section-nav-bottom) + env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    z-index: 1020; /* under the app's tab bars (1030) */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    width: max-content;
    max-width: calc(100vw - 2rem);
  }
  @media (max-width: 575.98px) {
    .section-nav-pill.signed-in {
      --section-nav-bottom: calc(var(--header-height, 64px) + 1.25rem);
    }
    /* Keep the extra in step with the pb-4 Header gives the tab bar in PWA mode */
    .section-nav-pill.signed-in.pwa {
      --section-nav-bottom: calc(var(--header-height, 64px) + 1.5rem + 1.25rem);
    }
  }
  @media (min-width: 768px) {
    .section-nav-pill {
      display: none;
    }
  }
  .section-nav-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 100%;
    padding: 0.65rem 1.15rem;
    border: 1px solid var(--bs-border-color, #dee2e6);
    background-color: var(--bs-body-bg, #fff);
    color: var(--bs-body-color);
    font-size: 1rem;
    cursor: pointer;
  }
  .section-nav-toggle:hover {
    background-color: var(--bs-tertiary-bg, #f8f9fa);
  }
  .section-nav-current {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
  }
  .section-nav-chevron {
    flex: 0 0 auto;
    transition: transform 0.2s;
  }
  .open .section-nav-chevron {
    transform: rotate(180deg);
  }
  .section-nav-menu {
    width: 18rem;
    max-width: calc(100vw - 2rem);
    max-height: calc(100vh - 9rem - var(--header-height, 64px));
    overflow-y: auto;
    padding: 0.4rem;
    border: 1px solid var(--bs-border-color, #dee2e6);
    background-color: var(--bs-body-bg, #fff);
  }
  @media (prefers-reduced-motion: reduce) {
    .section-nav-chevron {
      transition: none;
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
  /* Sits apart from the section list, at the bottom of the menu */
  .section-nav-top {
    margin-top: 0.4rem;
    border-top: 1px solid var(--bs-border-color, #dee2e6);
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    color: var(--bs-secondary-color, #6c757d);
  }
  .section-nav-count {
    flex: 0 0 auto;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--bs-secondary-color, #6c757d);
  }
</style>
