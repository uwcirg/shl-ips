<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Alert, Badge, Button, Icon, Modal, ModalBody, ModalFooter, ModalHeader, Spinner } from '@sveltestrap/sveltestrap';
  import type { Resource } from 'fhir/r4';
  import { PLACEHOLDER_SYSTEM } from '$lib/config/config';
  import { ResourceCollection } from '$lib/utils/ResourceCollection';
  import type { PreparedImport } from '$lib/utils/FHIRDataService';
  import FHIRResourceList from '$lib/components/app/FHIRResourceList.svelte';

  export let prepared: PreparedImport | undefined = undefined;
  export let processing: boolean = false;

  const dispatch = createEventDispatcher<{ confirm: PreparedImport, cancel: void }>();

  // Display a copy so the collection's patient-reference updates don't alter the prepared resources
  let collection: ResourceCollection | undefined;
  $: collection = prepared ? new ResourceCollection(structuredClone(prepared.resources)) : undefined;

  // When replacing an existing dataset, list what is new, updated, and removed separately
  function buildCollection(resources: Resource[], tagSource: Resource | undefined) {
    // A collection needs a Patient (it holds the dataset's tags), so give each section a hidden one
    const patient = {
      resourceType: 'Patient',
      id: 'diff-placeholder',
      meta: { tag: [...(tagSource?.meta?.tag ?? []), { system: PLACEHOLDER_SYSTEM, code: 'placeholder-patient' }] }
    } as Resource;
    return new ResourceCollection([patient, ...structuredClone(resources)]);
  }

  let sections: Array<{ key: string, title: string, collapsed: boolean, count: number, collection: ResourceCollection }> = [];
  $: sections = prepared?.diff ? buildSections(prepared) : [];

  function buildSections(prepared: PreparedImport) {
    const diff = prepared.diff!;
    const patient = prepared.resources.find((resource) => resource.resourceType === 'Patient');
    return [
      { key: 'added', title: 'New', collapsed: false, resources: diff.added },
      { key: 'updated', title: 'Updated', collapsed: false, resources: diff.updated.map(({ incoming }) => incoming) },
      { key: 'unchanged', title: 'Unchanged', collapsed: true, resources: diff.unchanged.map(({ incoming }) => incoming) },
      { key: 'removed', title: 'To be deleted (no longer in this source)', collapsed: true, resources: diff.removed }
    ]
      .filter((section) => section.resources.length > 0)
      .map(({ resources, ...section }) => ({ ...section, count: resources.length, collection: buildCollection(resources, patient) }));
  }

  // What is being confirmed, which decides the wording:
  //  import/submit: no existing dataset (external sources are imported, internal ones, i.e. forms on
  //                 this site, are submitted)
  //  update:        replacing an existing dataset that changed, or one that couldn't be loaded to compare
  //  unchanged:     the existing dataset already matches, so nothing needs to happen
  type Mode = 'import' | 'submit' | 'update' | 'unchanged';
  let mode: Mode = 'import';
  // Only updated while there is something to confirm, so the wording doesn't change as the modal closes
  $: if (prepared) mode = getMode(prepared);

  function getMode(prepared: PreparedImport): Mode {
    if (prepared.existingDataset === 'none') {
      return prepared.dataset.source === window.location.origin ? 'submit' : 'import';
    }
    const diff = prepared.diff;
    const hasChanges = !diff || diff.added.length > 0 || diff.updated.length > 0 || diff.removed.length > 0 || prepared.existingDataset === 'failed';
    return hasChanges ? 'update' : 'unchanged';
  }

  const TITLES: Record<Mode, string> = {
    import: 'Confirm import',
    submit: 'Confirm submission',
    update: 'Confirm update',
    unchanged: 'No changes'
  };

  function cancel() {
    if (!processing) {
      dispatch('cancel');
    }
  }
</script>

<Modal isOpen={Boolean(prepared)} backdrop="static" size={mode === 'unchanged' ? 'md' : 'lg'} scrollable toggle={cancel}>
  <ModalHeader toggle={cancel}>{TITLES[mode]}</ModalHeader>
  <ModalBody>
    {#if prepared && collection}
      {#if mode === 'unchanged'}
        <p class="mb-0">
          Your existing data from {prepared.dataset.sourceName} is already up to date. Nothing has been changed.
        </p>
      {:else}
        {#if mode === 'update'}
          {#if prepared.existingDataset === 'failed'}
            <Alert color="warning">
              Differences between your old data from {prepared.dataset.sourceName} and the new data couldn't be displayed.
              You may still replace it with the new data from this source.
            </Alert>
          {/if}
          <p>
            The following changes will be made to your existing data from {prepared.dataset.sourceName}.
          </p>
        {:else if mode === 'submit'}
          <p>The following information will be saved to your profile.</p>
        {:else}
          <p>The following information retrieved from {prepared.dataset.sourceName} will be saved to your profile.</p>
        {/if}
        {#if sections.length}
          {#each sections as section (section.key)}
            <details class="mb-3" open={!section.collapsed}>
              <summary class="mb-2 fw-bold">
                {section.title} <Badge color={section.key === 'removed' ? 'danger' : section.key === 'unchanged' ? 'secondary' : 'primary'}>{section.count}</Badge>
              </summary>
              <FHIRResourceList resourceCollection={section.collection} scroll={false} />
            </details>
          {/each}
        {:else}
          {#key prepared}
            <FHIRResourceList resourceCollection={collection} scroll={false} />
          {/key}
        {/if}
      {/if}
    {/if}
  </ModalBody>
  <ModalFooter>
    {#if mode === 'unchanged'}
      <Button color="primary" on:click={cancel}>Close</Button>
    {:else}
      <Button color="secondary" disabled={processing} on:click={cancel}>Cancel</Button>
      <Button
        color="primary"
        disabled={processing}
        on:click={() => prepared && dispatch('confirm', prepared)}
      >
        {#if processing}<Spinner size="sm" />{:else}<Icon name="check-lg" />{/if} Confirm
      </Button>
    {/if}
  </ModalFooter>
</Modal>
