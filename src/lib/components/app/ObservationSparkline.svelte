<script lang="ts">
  import type { SparklinePoint } from '$lib/utils/observationSparkline';

  export let series: SparklinePoint[] = [];
  export let currentId: string;

  const width = 120;
  const height = 32;
  const padX = 5;
  const padY = 6;

  $: n = series.length;
  $: ys = series.map(p => p.y);
  $: minY = ys.length ? Math.min(...ys) : 0;
  $: maxY = ys.length ? Math.max(...ys) : 0;
  $: span = maxY - minY;

  function xFor(i: number): number {
    if (n <= 1) return width / 2;
    return padX + (i * (width - 2 * padX)) / (n - 1);
  }
  // Higher value -> higher on the chart (smaller pixel y). Flat series centers.
  function yFor(v: number): number {
    if (span === 0) return height / 2;
    return height - padY - ((v - minY) / span) * (height - 2 * padY);
  }

  $: linePoints = series.map((p, i) => `${xFor(i)},${yFor(p.y)}`).join(' ');
</script>

{#if n >= 2}
  <svg
    {width}
    {height}
    viewBox={`0 0 ${width} ${height}`}
    role="img"
    aria-label="Trend of values sharing this code"
  >
    <polyline
      points={linePoints}
      fill="none"
      stroke="#6c757d"
      stroke-width="1.5"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
    {#each series as p, i}
      {#if p.id === currentId}
        <circle cx={xFor(i)} cy={yFor(p.y)} r="3.5" fill="#fd7e14" stroke="#fff" stroke-width="1" />
      {:else}
        <circle cx={xFor(i)} cy={yFor(p.y)} r="1.6" fill="#6c757d" />
      {/if}
    {/each}
  </svg>
{/if}
