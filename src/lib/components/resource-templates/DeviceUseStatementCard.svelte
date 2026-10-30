<script lang="ts">
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { CodeableConcept as CodeableConceptType, Device, DeviceUseStatement } from 'fhir/r4';
  import { choiceDTFields, formatDate, hasChoiceDTField } from '$lib/utils/util';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';

  // Shared look for a DeviceUseStatement and its Device, used by both the grouped display
  // (DeviceUseStatementGroup) and the single-resource template (DeviceUseStatement).
  // Slots: "actions" (top right of the header, for the statement) and "device-actions" (beside
  // the device details). Pass `showDeviceActions` when the latter has content, so the device
  // section is shown even for a device with no details of its own.
  export let statement: DeviceUseStatement;
  export let device: Device | undefined = undefined;
  export let showDeviceActions = false;

  interface Detail {
    label: string;
    value?: string;
    concept?: CodeableConceptType; // shown through CodeableConcept, so code badges follow the page's setting
  }

  const text = (concept?: CodeableConceptType) =>
    concept?.text ?? concept?.coding?.find(coding => coding.display)?.display;

  // What to call the device: a name it carries (a user-friendly one first), else its type, else the
  // display text the statement gave it, which is all there is when the Device is missing or sparse.
  function deviceTitle(device: Device | undefined, fallback: string | undefined): string | undefined {
    const names = device?.deviceName ?? [];
    const name = names.find(n => n.type === 'user-friendly-name' && n.name)?.name
      ?? names.find(n => n.name)?.name;
    return name ?? text(device?.type) ?? fallback;
  }

  // The identifying details a Device has, in display order. Fields it lacks are left out, so a
  // sparse device gives none. The type is skipped when it is already the title.
  function deviceDetails(device: Device | undefined, title: string | undefined): Detail[] {
    if (!device) return [];
    const details: Detail[] = [];
    const add = (label: string, value?: string) => {
      if (value) details.push({ label, value });
    };
    if (device.type && text(device.type) !== title) details.push({ label: 'Type', concept: device.type });
    add('Manufacturer', device.manufacturer);
    add('Model', device.modelNumber);
    add('Serial number', device.serialNumber);
    const udi = device.udiCarrier?.find(carrier => carrier.carrierHRF || carrier.deviceIdentifier);
    add('UDI', udi?.carrierHRF ?? udi?.deviceIdentifier);
    add('Lot', device.lotNumber);
    if (device.manufactureDate) add('Manufactured', formatDate(device.manufactureDate));
    if (device.expirationDate) add('Expires', formatDate(device.expirationDate));
    return details;
  }

  $: title = deviceTitle(device, statement.device?.display);
  $: details = deviceDetails(device, title);
  $: notes = statement.note?.map(note => note.text).filter((note): note is string => !!note) ?? [];
  $: hasStatementDetails = !!statement.reasonCode?.length || !!statement.bodySite || notes.length > 0;
</script>

<div class="device-card border rounded-4 p-3">
  <div class="device-header">
    <div>
      {#if statement.status}
        <Badge color={statement.status === 'stopped' ? 'secondary' : 'primary'} class="mb-1">{statement.status}</Badge><br>
      {/if}
      {#if title}
        <strong>{title}</strong>
      {/if}
      {#if hasChoiceDTField('timing', statement)}
        <span class="device-timing">Timing: <Date fields={choiceDTFields('timing', statement)} /></span>
      {/if}
    </div>
    <div class="device-actions">
      <slot name="actions" />
    </div>
  </div>

  {#if details.length > 0 || (device && showDeviceActions)}
    <div class="device-divided device-section">
      <div class="device-rows">
        {#each details as detail}
          <div class="device-row">
            <span class="device-label">{detail.label}</span>
            <div class="device-value">
              {#if detail.concept}
                <CodeableConcept codeableConcept={detail.concept} bold={false} />
              {:else}
                {detail.value}
              {/if}
            </div>
          </div>
        {/each}
      </div>
      <div class="device-actions">
        <slot name="device-actions" />
      </div>
    </div>
  {/if}

  {#if hasStatementDetails}
    <div class="device-divided device-rows">
      {#each statement.reasonCode ?? [] as reason}
        <div class="device-row">
          <span class="device-label">Reason</span>
          <div class="device-value"><CodeableConcept codeableConcept={reason} bold={false} /></div>
        </div>
      {/each}
      {#if statement.bodySite}
        <div class="device-row">
          <span class="device-label">Site</span>
          <div class="device-value"><CodeableConcept codeableConcept={statement.bodySite} bold={false} /></div>
        </div>
      {/if}
      {#each notes as note}
        <div class="device-row">
          <span class="device-label">Note</span>
          <div class="device-value">{note}</div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .device-card {
    background: var(--bs-body-bg);
  }
  .device-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .device-timing {
    margin-left: 0.5rem;
    font-size: 0.85rem;
    color: var(--bs-secondary-color, #6c757d);
  }
  /* The device and the statement's own details are separate blocks under the header */
  .device-divided {
    margin-top: 0.6rem;
    padding-top: 0.6rem;
    border-top: 1px solid var(--bs-border-color-translucent, rgba(0, 0, 0, 0.1));
  }
  /* The device block pairs its rows with an actions slot */
  .device-section {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .device-section > .device-rows {
    flex: 1 1 auto;
    min-width: 0;
  }
  .device-row {
    display: flex;
    gap: 0.75rem;
    padding: 0.1rem 0;
  }
  .device-label {
    flex: 0 0 8rem;
    font-size: 0.85rem;
    color: var(--bs-secondary-color, #6c757d);
  }
  .device-value {
    flex: 1 1 auto;
    min-width: 0;
    overflow-wrap: anywhere;
  }
</style>
