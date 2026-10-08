<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Alert, Badge, Button, Col, Icon, Modal, ModalBody, ModalFooter, ModalHeader, Row, Spinner } from '@sveltestrap/sveltestrap';
  import type { Resource } from 'fhir/r4';
  import { PLACEHOLDER_SYSTEM } from '$lib/config/config';
  import { ResourceCollection } from '$lib/utils/ResourceCollection';
  import type { PreparedImport } from '$lib/utils/FHIRDataService';
  import type { PatientMismatchField } from '$lib/utils/importNormalization';
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

  type PatientPair = { incoming: ResourceCollection, existing: ResourceCollection };
  let sections: Array<{
    key: string,
    title: string,
    collapsed: boolean,
    count: number,
    collection?: ResourceCollection, // the section's resources, if there are any besides a patient pair
    patientPair?: PatientPair // a changed patient, shown as before and after
  }> = [];
  $: sections = prepared?.diff ? buildSections(prepared) : [];

  function buildSections(prepared: PreparedImport) {
    const diff = prepared.diff!;
    const patient = prepared.resources.find((resource) => resource.resourceType === 'Patient');
    const isPatient = ({ incoming }: { incoming: Resource }) => incoming.resourceType === 'Patient';
    const changedPatient = diff.updated.find(isPatient);
    const patientCollection = (resource: Resource) => new ResourceCollection([structuredClone(resource)]);
    const entries: Array<{ key: string, title: string, collapsed: boolean, resources: Resource[], patientPair?: PatientPair }> = [
      {
        key: 'updated', title: 'Updated', collapsed: false,
        resources: diff.updated.filter((pair) => !isPatient(pair)).map(({ incoming }) => incoming),
        patientPair: changedPatient && {
          incoming: patientCollection(changedPatient.incoming),
          existing: patientCollection(changedPatient.existing)
        }
      },
      { key: 'added', title: 'New', collapsed: false, resources: diff.added },
      { key: 'unchanged', title: 'Unchanged', collapsed: true, resources: diff.unchanged.map(({ incoming }) => incoming) },
      { key: 'removed', title: 'To be deleted (no longer in this source)', collapsed: true, resources: diff.removed }
    ];
    return entries
      .filter((section) => section.resources.length > 0 || section.patientPair)
      .map(({ resources, ...section }) => ({
        ...section,
        count: resources.length + (section.patientPair ? 1 : 0),
        collection: resources.length ? buildCollection(resources, patient) : undefined
      }));
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

  const MISMATCH_LABELS: Record<PatientMismatchField, string> = {
    name: 'name',
    birthDate: 'date of birth',
    identifier: 'medical record number'
  };

  function formatMismatchFields(fields: PatientMismatchField[]) {
    return new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(fields.map((field) => MISMATCH_LABELS[field]));
  }

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
        {#if prepared.diff?.patientMismatch}
          <Alert color="warning">
            The patient details in this data don't match your existing data from {prepared.dataset.sourceName}
            ({formatMismatchFields(prepared.diff.patientMismatch.fields)} {prepared.diff.patientMismatch.fields.length > 1 ? 'are' : 'is'} different).
            Make sure this is your information before replacing your data.
          </Alert>
        {/if}
        {#if sections.length}
          {#each sections as section (section.key)}
            <details class="mb-3" open={!section.collapsed}>
              <summary class="mb-2 fw-bold">
                {section.title} <Badge color={section.key === 'removed' ? 'danger' : section.key === 'unchanged' ? 'secondary' : 'primary'}>{section.count}</Badge>
              </summary>
              {#if section.patientPair}
                <Row class="mb-3 gy-2">
                  <Col xs="12" md="6">
                    <div class="text-secondary mb-1">Existing patient</div>
                    <FHIRResourceList resourceCollection={section.patientPair.existing} scroll={false} sections={false} />
                  </Col>
                  <Col xs="12" md="6">
                    <div class="text-secondary mb-1">New patient</div>
                    <FHIRResourceList resourceCollection={section.patientPair.incoming} scroll={false} sections={false} />
                  </Col>
                </Row>
              {/if}
              {#if section.collection}
                <FHIRResourceList resourceCollection={section.collection} scroll={false} />
              {/if}
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
