<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { BundleEntry, Medication, MedicationRequest } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';
  import Dosage from '$lib/components/resource-templates/Dosage.svelte';
  import MedicationTemplate from '$lib/components/resource-templates/Medication.svelte';
  import { getEntry } from '$lib/utils/util';

  export let content: ResourceTemplateParams<MedicationRequest>; // Define a prop to pass the data to the component

  let resource: MedicationRequest = content.resource;

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

<Badge color="secondary">{resource.intent ? resource.intent : ''}</Badge>
<Badge color={resource.status === 'stopped' ? 'secondary' : 'primary'}>
  {resource.status ? `${resource.status}` : ''}
</Badge><br>
{#if resource.medicationCodeableConcept}
  <CodeableConcept codeableConcept={resource.medicationCodeableConcept} />
{/if}

{#if medication}
  <MedicationTemplate content={{ resource: medication, entries: content.entries }} />
{:else if resource.medicationReference?.display}
  <strong>{resource.medicationReference?.display}</strong>
  <br>
{/if}

{#if resource.authoredOn}
  Authored: <Date fields={{ dateTime: resource.authoredOn }} /><br>
{/if}
{#if resource.dispenseRequest?.validityPeriod}
  Valid: <Date period fields={{ period: resource.dispenseRequest.validityPeriod }} /><br>
{/if}

<Dosage dosages={resource.dosageInstruction} />
