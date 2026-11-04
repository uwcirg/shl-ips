<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ChartLine, SparklinePoint } from '$lib/utils/observationSparkline';

  // One or more lines sharing a time axis. Points are always coloured by source (colorFor). Lines
  // stay neutral and are told apart by dash pattern, with a legend.
  // Lines normally share one y axis (labelled with `unit`). When some lines have `axis: 1` (the same
  // measurement in a second unit), that axis is drawn on the right with its own scale and unit, and
  // selecting a point highlights the axis it is read against.
  export let lines: ChartLine[] = [];
  export let selectedId: string | undefined = undefined;
  export let unit = '';
  export let colorFor: (source?: string) => string | undefined = () => undefined;

  const dispatch = createEventDispatcher<{ select: string }>();

  const NEUTRAL_COLOR = '#6c757d';
  const width = 360;
  const height = 140;
  const padLeft = 40;
  const padRightSingle = 12;
  const padRightDual = 40;
  const padTop = 24;
  const padBottom = 26;

  $: multi = lines.length > 1;
  $: dual = lines.some(line => (line.axis ?? 0) > 0);
  $: padRight = dual ? padRightDual : padRightSingle;
  $: allPoints = lines.flatMap(line => line.points);
  // The value range of each axis; one axis unless there is a second
  $: ranges = [0, 1].slice(0, dual ? 2 : 1).map(axis => {
    const axisYs = lines.filter(line => (line.axis ?? 0) === axis).flatMap(line => line.points.map(p => p.y));
    const min = axisYs.length ? Math.min(...axisYs) : 0;
    const max = axisYs.length ? Math.max(...axisYs) : 0;
    return { min, max, span: max - min };
  });
  // The unit label of each axis. Computed reactively (not by a plain function the template calls):
  // the template only re-reads a value when something it names changes, so a helper reading `unit`,
  // `dual` and `lines` from inside would leave a stale label when the chart is reused for other data.
  $: axisUnits = ranges.map((_, axis) =>
    dual ? lines.find(line => (line.axis ?? 0) === axis)?.unit ?? '' : unit
  );
  // The selected observation's points: one per line it has a value on (e.g. systolic and diastolic),
  // highest on the chart first. Each is read against its line's axis.
  $: selectedPoints = lines
    .flatMap(line => line.points.filter(p => p.id === selectedId).map(point => ({ point, axis: line.axis ?? 0, line })))
    .sort((a, b) => yFor(a.point.y, a.axis) - yFor(b.point.y, b.axis));
  // The axes those points are read against, to highlight
  $: selectedAxes = new Set(selectedPoints.map(sp => sp.axis));
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
  $: yFor = (v: number, axis = 0): number => {
    const inner = height - padTop - padBottom;
    const { min, span } = ranges[axis] ?? ranges[0];
    if (span === 0) return padTop + inner / 2;
    return padTop + inner - ((v - min) / span) * inner;
  };

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
  // Reactive, like axisUnits, because they read `unit`, `dual` and `multi`
  $: unitFor = (line: ChartLine) => (dual ? line.unit : unit);
  $: tooltip = (line: ChartLine, p: SparklinePoint): string => {
    const parts = [multi ? `${line.label}: ${formatValue(p.y)}` : formatValue(p.y)];
    if (unitFor(line)) parts[0] += ` ${unitFor(line)}`;
    if (formatDate(p.time)) parts.push(formatDate(p.time));
    return parts.join(', ');
  };
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
            <span class="legend-label">{line.label}{dual && line.unit ? ` (${line.unit})` : ''}</span>
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
      <line x1={padLeft} y1={padTop} x2={padLeft} y2={height - padBottom} class="axis" class:axis-active={dual && selectedAxes.has(0)} />
      <line x1={padLeft} y1={height - padBottom} x2={width - padRight} y2={height - padBottom} class="axis" />
      {#if dual}
        <line x1={width - padRight} y1={padTop} x2={width - padRight} y2={height - padBottom} class="axis" class:axis-active={selectedAxes.has(1)} />
      {/if}
      {#each ranges as range, axis}
        {@const right = axis === 1}
        {@const x = right ? width - padRight + 4 : padLeft - 4}
        {@const anchor = right ? 'start' : 'end'}
        {@const active = dual && selectedAxes.has(axis)}
        <text {x} y={yFor(range.max, axis)} text-anchor={anchor} dominant-baseline="middle" font-size="9" class="axis-label" class:axis-label-active={active} class:axis-label-dim={dual && selectedPoints.length > 0 && !active}>{formatValue(range.max)}</text>
        {#if range.span !== 0}
          <text {x} y={yFor(range.min, axis)} text-anchor={anchor} dominant-baseline="middle" font-size="9" class="axis-label" class:axis-label-active={active} class:axis-label-dim={dual && selectedPoints.length > 0 && !active}>{formatValue(range.min)}</text>
        {/if}
        {#if axisUnits[axis]}
          <text x={right ? width - 2 : 2} y="9" text-anchor={right ? 'end' : 'start'} font-size="9" class="axis-label" class:axis-label-active={active} class:axis-label-dim={dual && selectedPoints.length > 0 && !active}>{axisUnits[axis]}</text>
        {/if}
      {/each}
      <text x={padLeft} y={height - 8} text-anchor="start" font-size="9" class="axis-label">{formatDate(minT)}</text>
      <text x={width - padRight} y={height - 8} text-anchor="end" font-size="9" class="axis-label">{formatDate(maxT)}</text>

      {#each lines as line, i}
        <polyline
          points={line.points.map(p => `${xFor(p)},${yFor(p.y, line.axis ?? 0)}`).join(' ')}
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
            cy={yFor(p.y, line.axis ?? 0)}
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
      {#each selectedPoints as selected, index}
        <!-- Each selected point's value, in the unit of the scale it is read against (which, with
             two axes, also says which one applies), on a rounded box (no border) so it reads over
             the chart. With several points (e.g. systolic and diastolic) the top one's label goes
             above its point and the others' below theirs, so the labels don't overlap. -->
        {@const text = `${formatValue(selected.point.y)}${unitFor(selected.line) ? ` ${unitFor(selected.line)}` : ''}`}
        {@const boxWidth = text.length * 6 + 2}
        {@const boxHeight = 14}
        {@const pointX = xFor(selected.point)}
        {@const pointY = yFor(selected.point.y, selected.axis)}
        <!-- Below its point when there is room above the x axis; otherwise beside the point, so
             it covers neither the point nor the axis -->
        {@const fitsBelow = pointY + 14 + boxHeight / 2 <= height - padBottom}
        {@const beside = index > 0 && !fitsBelow}
        {@const fitsRight = pointX + 8 + boxWidth <= width - 2}
        {@const centerX = beside
          ? (fitsRight ? pointX + 8 + boxWidth / 2 : pointX - 8 - boxWidth / 2)
          : Math.min(Math.max(pointX, boxWidth / 2 + 2), width - boxWidth / 2 - 2)}
        {@const centerY = index === 0
          ? Math.max(pointY - 14, boxHeight / 2 + 1)
          : beside ? pointY : pointY + 14}
        <g class="selected-callout" pointer-events="none">
          <rect
            x={centerX - boxWidth / 2}
            y={centerY - boxHeight / 2}
            width={boxWidth}
            height={boxHeight}
            rx="4"
            class="selected-box"
          />
          <text
            x={centerX}
            y={centerY}
            text-anchor="middle"
            dominant-baseline="central"
            font-size="10"
            font-weight="600"
            class="selected-label"
          >{text}</text>
        </g>
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
  .axis-label-active,
  .selected-label {
    fill: var(--bs-primary, #0d6efd);
    font-weight: 600;
  }
  .selected-box {
    fill: var(--bs-body-bg, #fff);
  }
  .axis-label-dim {
    opacity: 0.45;
  }
  .axis.axis-active {
    stroke: var(--bs-primary, #0d6efd);
    stroke-width: 2;
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
