<script lang="ts">
  import { getContext } from 'svelte';
  import { Card, CardBody, Icon } from '@sveltestrap/sveltestrap';
  import FilterPanel from '$lib/components/app/FilterPanel.svelte';
  import FilterToggleButton from '$lib/components/app/FilterToggleButton.svelte';
  import type { createCategorizedStore } from '$lib/stores/categorizedResources';
  import { panelFilterCount, type ResourceFilterStore } from '$lib/stores/resourceFilters';

  // The filter button and search floated at the top left once the page has scrolled past the main
  // filter bar. The button opens the same filter controls as an overlaid dropdown, and the search
  // is just an icon until focused, when it grows across the page. Both share the main bar's store,
  // so selections and search text are the same in either place. Sized by its container: put it in
  // an absolutely positioned, full-width parent (see StickyFilters).
  export let filters: ResourceFilterStore = getContext('resourceFilters');
  export let categorizedStore: ReturnType<typeof createCategorizedStore> = getContext('categorizedStore');
  export let showSections = true;
  // Whether a section nav column sits below (md and up): while collapsed, the bar fills the width
  // of that column, with the search taking the space beside the button
  export let withNav = false;
  // Whether the dropdown is open; bindable so the host can keep it alive
  export let open = false;

  let root: HTMLElement;
  let searchInput: HTMLInputElement;
  $: activeCount = panelFilterCount($filters);

  // The path is captured when the click is dispatched. Checking the target's ancestry instead
  // would misfire for clicks on elements that re-render away before this handler runs (e.g. a
  // button that disappears once its filter is cleared), which read as outside clicks.
  function onWindowClick(event: MouseEvent) {
    if (open && root && !event.composedPath().includes(root)) open = false;
  }
  // Clicking the icon toggles the search, on the click rather than the press. Letting the label
  // act on its own would blur an expanded input on mousedown (shrinking the box mid-click) and
  // then refocus it on mouseup, so a slow click would collapse the search and bring it right back.
  // Suppressing both defaults leaves nothing to change until the click completes.
  function keepFocus(event: MouseEvent) {
    if (event.target !== searchInput) event.preventDefault();
  }
  function toggleSearch(event: MouseEvent) {
    if (event.target === searchInput) return;
    event.preventDefault();
    if (document.activeElement === searchInput) searchInput.blur();
    else searchInput.focus();
  }
  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') open = false;
    // Enter in the search or one of the menu's inputs means "done": collapse both. Buttons are
    // left alone, since Enter on a focused one activates it.
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement && event.composedPath().includes(root)) {
      open = false;
      searchInput?.blur();
    }
  }
</script>

<svelte:window on:click={onWindowClick} on:keydown={onKeydown} />

<div class="compact-filter-bar" bind:this={root}>
  <div class="compact-row d-flex">
    <div class="compact-controls d-flex gap-2 align-items-center" class:with-nav={withNav}>
      <FilterToggleButton open={open} count={activeCount} on:click={() => (open = !open)} />
      <!-- A label, so clicking the icon focuses the input -->
      <label class="compact-search shadow-sm" on:mousedown={keepFocus} on:click={toggleSearch}>
        <Icon name="search" class="compact-search-icon" />
        <input
          type="search"
          aria-label="Search your health data"
          placeholder="Search"
          bind:this={searchInput}
          value={$filters.text}
          on:input={(e) => filters.setTextDebounced(e.currentTarget.value)}
        />
        {#if $filters.text}
          <!-- Shown only while the search is expanded. Its press keeps focus in the input, and
               the click must not reach the label, which would toggle the search -->
          <button
            type="button"
            class="compact-search-clear"
            aria-label="Clear search"
            on:click|stopPropagation={() => filters.setText('')}
          >
            <Icon name="x-lg" />
          </button>
        {/if}
      </label>
    </div>
  </div>

  {#if open}
    <div class="compact-dropdown">
      <Card class="shadow compact-dropdown-card">
        <CardBody class="compact-dropdown-body">
          <FilterPanel {filters} {categorizedStore} {showSections} on:done={() => (open = false)} />
        </CardBody>
      </Card>
    </div>
  {/if}
</div>

<style>
  /* The row spans the container but only the controls inside it take clicks (the container above
     passes them through, and pointer-events is inherited, so the controls opt back in) */
  .compact-row {
    pointer-events: none;
  }
  .compact-controls {
    pointer-events: auto;
    max-width: 100%;
  }
  /* The buttons always have the small shadow; it gets stronger when there is no sidebar beside
     them (below md, or no nav at all), and for the search whenever it is expanded */
  .compact-controls:not(.with-nav) :global(.shadow-sm) {
    box-shadow: var(--bs-box-shadow) !important;
  }
  @media (max-width: 767.98px) {
    .compact-controls :global(.shadow-sm) {
      box-shadow: var(--bs-box-shadow) !important;
    }
  }
  .compact-controls .compact-search:focus-within {
    box-shadow: var(--bs-box-shadow) !important;
  }

  /* Focusing the search lets the controls fill the row */
  .compact-controls:has(.compact-search:focus-within) {
    flex: 1 1 auto;
  }
  /* With the nav beside the content, the controls are as wide as the nav column (13rem, set in
     DataSummary) and the search fills what the button leaves */
  @media (min-width: 768px) {
    .compact-controls.with-nav {
      flex: 0 0 13rem;
    }
    .compact-controls.with-nav:has(.compact-search:focus-within) {
      flex: 1 1 auto;
    }
    .compact-controls.with-nav .compact-search {
      flex: 1 1 0;
    }
  }

  /* Collapsed to an icon; focusing it fills the rest of the row, up to the container's edge */
  .compact-search {
    display: flex;
    align-items: center;
    flex: 0 0 2.5rem;
    height: 2.5rem;
    margin: 0;
    position: relative;
    overflow: hidden;
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius);
    background: var(--bs-body-bg);
  }
  /* Fades out text that runs past the right edge while collapsed */
  .compact-search::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 1.25rem;
    height: 100%;
    background: linear-gradient(to right, transparent, var(--bs-body-bg));
    pointer-events: none;
  }
  .compact-search:focus-within::after {
    display: none;
  }
  .compact-search:focus-within {
    flex: 1 1 0;
  }
  /* Where the collapsed search is just an icon (no nav column beside it, or below md), the input
     takes no room at all, so none of the hint text peeks out beside the icon */
  .compact-controls:not(.with-nav) .compact-search:not(:focus-within) input {
    flex: 0 0 0;
    margin-left: 0;
  }
  .compact-controls:not(.with-nav) .compact-search:not(:focus-within)::after {
    display: none;
  }
  @media (max-width: 767.98px) {
    .compact-controls .compact-search:not(:focus-within) input {
      flex: 0 0 0;
      margin-left: 0;
    }
    .compact-controls .compact-search:not(:focus-within)::after {
      display: none;
    }
  }
  .compact-search :global(.compact-search-icon) {
    flex: 0 0 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: -1px;
    pointer-events: none;
    color: var(--bs-secondary-color);
  }
  .compact-search input {
    flex: 1;
    min-width: 0;
    width: 0;
    height: 100%;
    /* Pulls the hint text in toward the icon, whose box is wider than the glyph */
    margin-left: -0.5rem;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
  }
  .compact-search input,
  .compact-search input::placeholder {
    text-overflow: ellipsis;
  }
  .compact-search-clear {
    display: none;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 100%;
    padding: 0;
    border: 0;
    background: none;
    color: var(--bs-secondary-color);
    cursor: pointer;
  }
  .compact-search:focus-within .compact-search-clear {
    display: flex;
  }
  .compact-search:focus-within input {
    padding-right: 0.75rem;
  }

  /* Positioned against the full-width floating container, not this component */
  .compact-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    right: 0;
    pointer-events: auto;
  }
  /* Expanding the source and section lists can outgrow the viewport, so the panel scrolls. The
     dropdown starts 4rem below the top of the viewport (1rem gap above, 2.5rem controls, 0.5rem
     gap), and the app's bottom nav (taller as an installed PWA, which adds the home indicator's
     safe area) covers the bottom edge, so a generous margin is left for it. dvh tracks mobile
     browser toolbars; vh is the fallback. */
  .compact-dropdown :global(.compact-dropdown-body) {
    max-height: calc(100vh - var(--filters-overlay, 0px) - 10rem - env(safe-area-inset-bottom, 0px));
    max-height: calc(100dvh - var(--filters-overlay, 0px) - 10rem - env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
  }
</style>
