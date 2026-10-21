<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ChartLine, SparklinePoint } from '$lib/utils/observationSparkline';

  // One or more lines sharing a time axis and a y axis. Points are always coloured by source
  // (colorFor). Lines stay neutral and are told apart by dash pattern, with a legend.
  export let lines: ChartLine[] = [];
  export let selectedId: string | undefined = undefined;
  export let unit = '';
  export let colorFor: (source?: string) => string | undefined = () => undefined;

  const dispatch = createEventDispatcher<{ select: string }>();

  const NEUTRAL_COLOR = '#6c757d';
  const width = 360;
  const height = 140;
  const padLeft = 40;
  const padRight = 12;
  const padTop = 24;
  const padBottom = 26;

  $: multi = lines.length > 1;
  $: allPoints = lines.flatMap(line => line.points);
  $: ys = allPoints.map(p => p.y);
  $: minY = ys.length ? Math.min(...ys) : 0;
  $: maxY = ys.length ? Math.max(...ys) : 0;
  $: span = maxY - minY;
  $: times = allPoints.map(p => p.time);
  $: minT = times.length ? Math.min(...times) : 0;
  $: maxT = times.length ? Math.max(...times) : 0;
  // Fall back to even spacing when dates are missing or all identical
  $: useTime = allPoints.length > 1 && allPoints.every(p => p.time > 0) && maxT > minT;
  // Even-spacing position per observation, shared across lines so they stay aligned
  $: rankById = (() => {
    const ordered = [...new Map(allPoints.map(p => [p.id, p.time])).entries()].sort((a, b) => a[1] - b[1]);
    return new Map(ordered.map(([id], i) => [id, i]));
  })();

  function xFor(p: SparklinePoint): number {
    const inner = width - padLeft - padRight;
    if (useTime) return padLeft + ((p.time - minT) / (maxT - minT)) * inner;
    const count = rankById.size;
    if (count <= 1) return padLeft + inner / 2;
    return padLeft + ((rankById.get(p.id) ?? 0) * inner) / (count - 1);
  }
  // Higher value -> higher on the chart (smaller pixel y). Flat series centers.
  function yFor(v: number): number {
    const inner = height - padTop - padBottom;
    if (span === 0) return padTop + inner / 2;
    return padTop + inner - ((v - minY) / span) * inner;
  }

  function formatDate(time: number): string {
    return time > 0 ? new Date(time).toLocaleDateString() : '';
  }
  function formatValue(v: number): string {
    return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
  }
  // Solid, dashed, dotted, dash-dot. Round caps make the 1-length dashes read as dots.
  const DASHES = [undefined, '7 4', '1 5', '8 3 1 3'];
  const dashFor = (i: number) => DASHES[i % DASHES.length];
  const pointColor = (p: SparklinePoint): string => colorFor(p.source) ?? NEUTRAL_COLOR;
  function tooltip(line: ChartLine, p: SparklinePoint): string {
    const parts = [multi ? `${line.label}: ${formatValue(p.y)}` : formatValue(p.y)];
    if (unit) parts[0] += ` ${unit}`;
    if (formatDate(p.time)) parts.push(formatDate(p.time));
    return parts.join(', ');
  }
</script>

{#if allPoints.length >= 2}
  <div class="obs-chart">
    {#if multi}
      <ul class="legend list-unstyled d-flex flex-wrap gap-3 mb-1">
        {#each lines as line, i}
          <li class="d-flex align-items-center gap-1">
            <svg class="legend-key" width="22" height="6" viewBox="0 0 22 6" aria-hidden="true">
              <line x1="1" y1="3" x2="21" y2="3" class="legend-line" stroke-dasharray={dashFor(i)} />
            </svg>
            <span class="legend-label">{line.label}</span>
          </li>
        {/each}
      </ul>
    {/if}
    <svg
      width="100%"
      viewBox={`0 0 ${width} ${height}`}
      style={`max-width: ${width * 1.5}px; height: auto;`}
      role="img"
      aria-label={`Trend of ${lines.map(l => l.label).filter(Boolean).join(', ') || 'values'}`}
    >
      <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} class="axis" />
      <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} class="axis" />
      <text x={padLeft - 4} y={yFor(maxY)} text-anchor="end" dominant-baseline="middle" font-size="9" class="axis-label">{formatValue(maxY)}</text>
      {#if span !== 0}
        <text x={padLeft - 4} y={yFor(minY)} text-anchor="end" dominant-baseline="middle" font-size="9" class="axis-label">{formatValue(minY)}</text>
      {/if}
      {#if unit}
        <text x="2" y="9" text-anchor="start" font-size="9" class="axis-label">{unit}</text>
      {/if}
      <text x={padLeft} y={height - 8} text-anchor="start" font-size="9" class="axis-label">{formatDate(minT)}</text>
      <text x={width - padRight} y={height - 8} text-anchor="end" font-size="9" class="axis-label">{formatDate(maxT)}</text>

      {#each lines as line, i}
        <polyline
          points={line.points.map(p => `${xFor(p)},${yFor(p.y)}`).join(' ')}
          fill="none"
          class="series-line"
          stroke-dasharray={dashFor(i)}
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      {/each}
      {#each lines as line, i}
        {#each line.points as p}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <circle
            cx={xFor(p)}
            cy={yFor(p.y)}
            r={p.id === selectedId ? 7 : 4}
            style:fill={pointColor(p)}
            class="point"
            role="button"
            tabindex="0"
            on:click={() => dispatch('select', p.id)}
            on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && dispatch('select', p.id)}
          >
            <title>{tooltip(line, p)}</title>
          </circle>
        {/each}
      {/each}
    </svg>
  </div>
{/if}

<style>
  .obs-chart {
    --line-neutral: #adb5bd;
    --axis: #dee2e6;
    --axis-text: #6c757d;
  }
  :global([data-bs-theme='dark']) .obs-chart {
    --line-neutral: #6c757d;
    --axis: #495057;
    --axis-text: #adb5bd;
  }
  .axis {
    stroke: var(--axis);
    stroke-width: 1;
  }
  .axis-label {
    fill: var(--axis-text);
  }
  /* 2px ring in the surface colour keeps overlapping points legible */
  .point {
    stroke: var(--bs-body-bg, #fff);
    stroke-width: 2;
    cursor: pointer;
  }
  .legend {
    font-size: 0.8rem;
  }
  .series-line,
  .legend-line {
    stroke: var(--line-neutral);
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .legend-key {
    flex: 0 0 auto;
  }
  .legend-label {
    color: var(--bs-secondary-color, #6c757d);
  }
</style>
