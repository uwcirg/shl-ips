<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { BundleEntry, Device, DeviceUseStatement } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import DeviceTemplate from '$lib/components/resource-templates/Device.svelte';
  import { getEntry } from '$lib/utils/util';

  export let content: ResourceTemplateParams<DeviceUseStatement>; // Define a prop to pass the data to the component

  let resource: DeviceUseStatement = content.resource;

  let device: Device | undefined;

  $: {
    if (resource) {
      if (resource.device) {
        if (resource.contained?.[0]?.resourceType === 'Device') {
          // If the device is contained in the resource
          device = resource.contained[0];
        } else if (resource.device?.reference) {
          // If the device is referenced
          device = getEntry(content.entries as BundleEntry[], resource.device.reference) as Device;
        }
      }
    }
  }
</script>

<Badge color={resource.status === 'stopped' ? 'secondary' : 'primary'}
  >{resource.status ? `${resource.status}` : ''}</Badge
>
<br />

{#if device}
  <DeviceTemplate content={{ resource: device, entries: content.entries }} />
{:else if resource.device?.display}
  <strong>{resource.device?.display}</strong>
  <br>
{/if}
