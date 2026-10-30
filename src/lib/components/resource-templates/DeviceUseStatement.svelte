<script lang="ts">
  import type { BundleEntry, Device, DeviceUseStatement } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import DeviceUseStatementCard from '$lib/components/resource-templates/DeviceUseStatementCard.svelte';
  import { getEntry } from '$lib/utils/util';

  // Used when a statement is shown on its own: its device is contained, can't be resolved into a
  // grouped display, or the statement is shown in the viewer/selector views. The surrounding list
  // supplies the statement's "View" button, so none is rendered here.
  export let content: ResourceTemplateParams<DeviceUseStatement>; // Define a prop to pass the data to the component

  let resource: DeviceUseStatement;
  $: if (content) resource = content.resource;

  function resolveDevice(statement: DeviceUseStatement, entries: BundleEntry[] | undefined): Device | undefined {
    const reference = statement.device?.reference;
    if (!reference) return undefined;
    // A contained device first, matched by id for a "#id" reference
    const containedId = reference.startsWith('#') ? reference.slice(1) : undefined;
    const contained = statement.contained?.find(
      (resource) => resource.resourceType === 'Device' && (!containedId || resource.id === containedId)
    ) as Device | undefined;
    if (contained) return contained;
    return containedId ? undefined : (getEntry(entries as BundleEntry[], reference) as Device | undefined);
  }

  $: device = resource ? resolveDevice(resource, content.entries) : undefined;
</script>

<DeviceUseStatementCard statement={resource} {device} />
