<script lang="ts">
  import { Card, CardBody, CardHeader } from '@sveltestrap/sveltestrap';

  // Placeholder for the category list while the first data loads in. Shaped like CategoryView
  // cards so the real content lands in the same place.
  export let cards = 2;
  export let rows = 3;
  // Placeholder entries in the section nav column, shown from md up like the real nav
  export let navItems = 5;
  // Pages scoped to one category have no section nav
  export let showNav = true;
</script>

<div class="skeleton-layout" class:with-nav={showNav} aria-hidden="true">
  {#if showNav}
    <div class="skeleton-nav">
      {#each Array(navItems) as _}
        <div class="skeleton skeleton-nav-item"></div>
      {/each}
    </div>
  {/if}
  <div class="skeleton-list">
    {#each Array(cards) as _}
      <Card class="mb-4">
        <CardHeader>
          <div class="skeleton skeleton-title"></div>
        </CardHeader>
        <CardBody>
          {#each Array(rows) as __}
            <div class="skeleton skeleton-line mb-3"></div>
          {/each}
        </CardBody>
      </Card>
    {/each}
  </div>
</div>

<style>
  /* Mirrors the category layout in DataSummary: the nav column shows from md up */
  .skeleton-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
  }
  .skeleton-nav {
    display: none;
  }
  @media (min-width: 768px) {
    .skeleton-layout.with-nav {
      grid-template-columns: var(--section-nav-width, 14.5rem) minmax(0, 1fr);
    }
    .skeleton-nav {
      display: block;
    }
  }
  .skeleton-list {
    min-width: 0;
  }
  .skeleton-nav-item {
    height: 1.9rem;
    margin-bottom: 0.4rem;
  }
  .skeleton {
    border-radius: var(--bs-border-radius);
    background: linear-gradient(90deg, var(--bs-secondary-bg) 25%, var(--bs-tertiary-bg) 50%, var(--bs-secondary-bg) 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.4s ease-in-out infinite;
  }
  .skeleton-title {
    width: 10rem;
    height: 1.25rem;
  }
  .skeleton-line {
    width: 100%;
    height: 2.5rem;
  }
  @keyframes skeleton-shimmer {
    from { background-position: 200% 0; }
    to { background-position: -200% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .skeleton { animation: none; }
  }
</style>
