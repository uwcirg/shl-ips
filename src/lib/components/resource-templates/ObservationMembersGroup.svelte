<script lang="ts">
  import { Button } from '@sveltestrap/sveltestrap';
  import type { Observation } from 'fhir/r4';
  import type { GroupUnit, ObservationMembersData } from '$lib/stores/displayUnits';
  import type { ResourceHelper } from '$lib/utils/ResourceHelper';
  import { getValueString } from '$lib/utils/observationSparkline';
  import DiagnosticReportCard from '$lib/components/resource-templates/DiagnosticReportCard.svelte';
  import GroupShowMore from '$lib/components/resource-templates/GroupShowMore.svelte';
  import ObservationTemplate from '$lib/components/resource-templates/Observation.svelte';

  // An Observation with hasMember references, shown with its member Observations under it. It takes
  // the look of a diagnostic report and its results: the parent's header, then its members in a
  // list marked by a line down the left side.
  export let unit: GroupUnit<ObservationMembersData>;
  // Part of the group template contract; this template resolves everything from the unit itself
  // svelte-ignore unused-export-let
  export let entries: unknown[] = [];
  // Called with a resource's helper when a "View" button is pressed (advanced mode only)
  export let onView: ((rh: ResourceHelper) => void) | undefined = undefined;
  export let advanced = false;

  const INITIAL_MEMBERS = 5;

  // Svelte 4 doesn't allow TS syntax in markup, so casts live here
  const asObservation = (rh: ResourceHelper) => rh.resource as Observation;

  let showAll = false;

  $: parent = asObservation(unit.data.parent.rh);
  $: members = unit.data.members;
  $: visibleMembers = showAll ? members : members.slice(0, INITIAL_MEMBERS);
  $: hiddenCount = members.length - visibleMembers.length;
  // Only the parent's own members are offered for hasMember resolution, which keeps each member
  // from searching (and graphing against) the whole collection
  $: memberEntries = members.map(member => ({ resource: member.rh.resource }));
  // The parent's own value and notes, if it has any
  $: value = getValueString(parent);
  $: notes = parent.note?.map(note => note.text).filter((text): text is string => !!text) ?? [];
</script>

<DiagnosticReportCard report={parent}>
  <svelte:fragment slot="actions">
    {#if advanced && onView}
      <Button size="sm" color="secondary" outline on:click={() => onView?.(unit.data.parent.rh)}>View</Button>
    {/if}
  </svelte:fragment>

  <svelte:fragment slot="details">
    {#if value}
      <div>{value}</div>
    {/if}
    {#each notes as note}
      <div>Note: {note}</div>
    {/each}
  </svelte:fragment>

  {#each visibleMembers as member (member.rh.tempId)}
    <div class="report-result">
      <div class="report-result-content">
        <!-- The parent's date is shown once in its header, so members don't repeat theirs -->
        <ObservationTemplate
          content={{ resource: member.rh.resource, entries: memberEntries }}
          contained={true}
        />
      </div>
      {#if advanced && onView}
        <Button size="sm" color="secondary" outline on:click={() => onView?.(member.rh)}>View</Button>
      {/if}
    </div>
  {/each}
  {#each unit.data.unresolved as display}
    <div class="report-result text-muted">
      <div class="report-result-content">{display}</div>
    </div>
  {/each}
  <GroupShowMore {hiddenCount} noun="more member" bind:expanded={showAll} />
</DiagnosticReportCard>
