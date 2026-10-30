<script lang="ts">
  import { Button } from '@sveltestrap/sveltestrap';
  import type { Device, DeviceUseStatement } from 'fhir/r4';
  import type { DeviceUseStatementData, GroupUnit } from '$lib/stores/displayUnits';
  import type { ResourceHelper } from '$lib/utils/ResourceHelper';
  import DeviceUseStatementCard from '$lib/components/resource-templates/DeviceUseStatementCard.svelte';

  export let unit: GroupUnit<DeviceUseStatementData>;
  // Part of the group template contract; this template resolves everything from the unit itself
  // svelte-ignore unused-export-let
  export let entries: unknown[] = [];
  // Called with a resource's helper when a "View" button is pressed (advanced mode only)
  export let onView: ((rh: ResourceHelper) => void) | undefined = undefined;
  export let advanced = false;

  // Svelte 4 doesn't allow TS syntax in markup, so casts live here
  const asStatement = (rh: ResourceHelper) => rh.resource as DeviceUseStatement;
  const asDevice = (rh: ResourceHelper) => rh.resource as Device;

  $: statement = asStatement(unit.data.statement.rh);
  $: device = asDevice(unit.data.device.rh);
</script>

<DeviceUseStatementCard {statement} {device} showDeviceActions={advanced && !!onView}>
  <svelte:fragment slot="actions">
    {#if advanced && onView}
      <Button size="sm" color="secondary" outline on:click={() => onView?.(unit.data.statement.rh)}>View</Button>
    {/if}
  </svelte:fragment>
  <svelte:fragment slot="device-actions">
    {#if advanced && onView}
      <Button size="sm" color="secondary" outline on:click={() => onView?.(unit.data.device.rh)}>View</Button>
    {/if}
  </svelte:fragment>
</DeviceUseStatementCard>
