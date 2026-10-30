<script lang="ts">
  import { Button } from '@sveltestrap/sveltestrap';
  import type { Observation } from 'fhir/r4';
  import type { GroupUnit, ObservationSeriesData } from '$lib/stores/displayUnits';
  import type { ResourceHelper } from '$lib/utils/ResourceHelper';
  import { getObservationDisplayValue } from '$lib/utils/observationSparkline';
  import { choiceDTFields, hasChoiceDTField } from '$lib/utils/util';
  import ObservationChart from '$lib/components/resource-templates/ObservationChart.svelte';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';
  import GroupShowMore from '$lib/components/resource-templates/GroupShowMore.svelte';
  import GroupSourceDot from '$lib/components/resource-templates/GroupSourceDot.svelte';
  import { useGroupSources } from '$lib/components/resource-templates/groupSources';

  export let unit: GroupUnit<ObservationSeriesData>;
  // Part of the group template contract; this template resolves everything from the unit itself
  // svelte-ignore unused-export-let
  export let entries: unknown[] = [];
  // Called with a member's helper when the "View" button is pressed (advanced mode only)
  export let onView: ((rh: ResourceHelper) => void) | undefined = undefined;
  export let advanced = false;

  const { showSources, colorMap, sourceName, colorOf } = useGroupSources();
  $: colorFor = (source?: string) => colorOf(source, $colorMap);
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
          {#if showSources && name}
            <GroupSourceDot source={member.source} />
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
    <GroupShowMore {hiddenCount} noun="earlier reading" indent="0.65rem" bind:expanded={showAll} />
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
</style>
