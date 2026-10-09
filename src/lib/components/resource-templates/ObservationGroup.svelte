<script lang="ts">
  import { getContext } from 'svelte';
  import { readable, type Readable } from 'svelte/store';
  import { Button } from '@sveltestrap/sveltestrap';
  import type { Observation } from 'fhir/r4';
  import type { GroupUnit, ObservationSeriesData } from '$lib/stores/displayUnits';
  import type { ResourceHelper } from '$lib/utils/ResourceHelper';
  import { getObservationDisplayValue } from '$lib/utils/observationSparkline';
  import { choiceDTFields, hasChoiceDTField } from '$lib/utils/util';
  import { getFriendlySourceNameBySource } from '$lib/utils/resourceCollectionUtils';
  import ObservationChart from '$lib/components/app/ObservationChart.svelte';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';

  export let unit: GroupUnit<ObservationSeriesData>;
  // Called with a member's helper when the "View" button is pressed (advanced mode only)
  export let onView: ((rh: ResourceHelper) => void) | undefined = undefined;
  export let advanced = false;

  const colorMap: Readable<Map<string, string>> =
    getContext<Readable<Map<string, string>> | undefined>('colorMap') ?? readable(new Map());

  // Friendly names come from a memo that fills in alongside colorMap, so everything
  // derived from them is tied to $colorMap and recomputes when it changes.
  const sourceName = (source?: string, _colorMap?: Map<string, string>) =>
    source ? getFriendlySourceNameBySource(source) : undefined;
  $: colorFor = (source?: string) => {
    const name = sourceName(source, $colorMap);
    return (name && $colorMap.get(name)) || undefined;
  };
  // Svelte 4 doesn't allow TS syntax in markup, so casts live here
  const asObservation = (rh: ResourceHelper) => rh.resource as Observation;

  $: members = unit.members;
  $: primary = asObservation(members[0].rh);
  $: valueUnit = unit.data.lines[0]?.unit ?? '';

  const INITIAL_READINGS = 3;

  let selectedId: string | undefined;
  let showAll = false;

  // Members are newest first. Older readings stay hidden unless revealed, except a selected one,
  // so selecting a chart point always shows its row.
  $: visibleMembers = showAll
    ? members
    : members.filter((m, i) => i < INITIAL_READINGS || m.rh.tempId === selectedId);
  $: hiddenCount = members.length - visibleMembers.length;

  function select(id: string) {
    selectedId = selectedId === id ? undefined : id;
  }
</script>

<div class="observation-group border rounded-4 p-3">
  {#if primary.code}
    <div class="mb-2">
      <CodeableConcept codeableConcept={primary.code} />
    </div>
  {/if}

  <ObservationChart
    lines={unit.data.lines}
    {selectedId}
    unit={valueUnit}
    {colorFor}
    on:select={(e) => select(e.detail)}
  />

  <div class="readings mt-3">
    {#each visibleMembers as member (member.rh.tempId)}
      {@const resource = asObservation(member.rh)}
      {@const id = member.rh.tempId}
      {@const name = sourceName(member.source, $colorMap)}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="reading"
        class:selected={selectedId === id}
        role="button"
        tabindex="0"
        on:click={() => select(id)}
        on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && select(id)}
      >
        <span class="reading-date">
          {#if hasChoiceDTField('effective', resource)}
            <Date fields={choiceDTFields('effective', resource)} />
          {/if}
        </span>
        <span class="reading-value">{getObservationDisplayValue(resource) ?? ''}</span>
        <span class="reading-source">
          {#if name}
            <span class="source-dot" style:background={colorFor(member.source) ?? '#6c757d'}></span>
            {name}
          {/if}
        </span>
        {#if advanced && onView}
          <Button
            size="sm"
            color="secondary"
            outline
            on:click={(event) => {
              event.stopPropagation();
              onView?.(member.rh);
            }}
          >
            View
          </Button>
        {/if}
      </div>
    {/each}
    {#if members.length > INITIAL_READINGS && (hiddenCount > 0 || showAll)}
      <button type="button" class="show-more" on:click={() => (showAll = !showAll)}>
        {showAll ? 'Show fewer' : `Show ${hiddenCount} earlier reading${hiddenCount === 1 ? '' : 's'}`}
      </button>
    {/if}
  </div>
</div>

<style>
  .observation-group {
    background: var(--bs-body-bg);
  }
  .readings {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }
  .reading {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.4rem 0.65rem;
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.12s;
  }
  .reading:hover {
    background-color: var(--bs-tertiary-bg, #f8f9fa);
  }
  .reading.selected {
    background-color: var(--bs-secondary-bg, #e9ecef);
  }
  .show-more {
    align-self: flex-start;
    margin: 0.25rem 0 0 0.65rem;
    padding: 0;
    border: 0;
    background: none;
    font-size: 0.85rem;
    color: var(--bs-link-color, #0d6efd);
    cursor: pointer;
  }
  .show-more:hover {
    text-decoration: underline;
  }
  .reading-date {
    flex: 0 0 7.5rem;
    font-size: 0.85rem;
    color: var(--bs-secondary-color, #6c757d);
    white-space: nowrap;
  }
  .reading-value {
    flex: 1 1 auto;
    font-weight: 600;
  }
  .reading-source {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    color: var(--bs-secondary-color, #6c757d);
    white-space: nowrap;
  }
  .source-dot {
    display: inline-block;
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;
    background: #6c757d;
  }
</style>
