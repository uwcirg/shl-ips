<script lang="ts">
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { BundleEntry, Medication, MedicationRequest } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import DateLine from '$lib/components/resource-templates/DateLine.svelte';
  import Dosage from '$lib/components/resource-templates/Dosage.svelte';
  import MedicationTemplate from '$lib/components/resource-templates/Medication.svelte';
  import StatusBadge from '$lib/components/resource-templates/StatusBadge.svelte';
  import { getEntry, choiceDTFields } from '$lib/utils/util';

  export let content: ResourceTemplateParams<MedicationRequest>; // Define a prop to pass the data to the component

  let resource: MedicationRequest;
  $: if (content) resource = content.resource;

  let medication: Medication | undefined;

  $: {
    if (resource) {
      if (resource.medicationReference) {
        if (resource.contained?.[0]?.resourceType === 'Medication') {
          // If the medication is contained in the resource
          medication = resource.contained[0];
        } else if (resource.medicationReference?.reference) {
          // If the medication is referenced
          medication = getEntry(content.entries as BundleEntry[], resource.medicationReference.reference) as Medication;
        }
      }
    }
  }
</script>

<StatusBadge status={resource.status} br />
{#if resource.medicationCodeableConcept}
  <CodeableConcept codeableConcept={resource.medicationCodeableConcept} />
{/if}

{#if medication}
  <MedicationTemplate content={{ resource: medication, entries: content.entries }} />
{:else if resource.medicationReference?.display}
  <strong>{resource.medicationReference?.display}</strong>
  <br>
{/if}

<Dosage dosages={resource.dosageInstruction} />

{#if resource.authoredOn}
  <DateLine label="Authored" fields={choiceDTFields("authoredOn", resource)} />
{/if}
{#if resource.dispenseRequest?.validityPeriod}
  <DateLine label="Valid" period fields={{ period: resource.dispenseRequest.validityPeriod }} />
{/if}
