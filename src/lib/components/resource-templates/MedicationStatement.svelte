<script lang="ts">
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { BundleEntry, Medication, MedicationStatement } from "fhir/r4";
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';
  import Dosage from '$lib/components/resource-templates/Dosage.svelte';
  import MedicationTemplate from '$lib/components/resource-templates/Medication.svelte';
  import { getEntry } from '$lib/utils/util';
  import type { ResourceTemplateParams } from '$lib/utils/types';

  export let content: ResourceTemplateParams<MedicationStatement>; // Define a prop to pass the data to the component

  let resource: MedicationStatement = content.resource;

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

{#if resource.status}
  <Badge color={resource.status === "unknown" || resource.status === "stopped" ? "secondary" : "primary"}>
    {resource.status}
  </Badge><br>
{/if}

{#if resource.medicationCodeableConcept}
  <CodeableConcept codeableConcept={resource.medicationCodeableConcept} />
{/if}

{#if medication}
  <MedicationTemplate content={{ resource: medication, entries: content.entries }} />
{:else if resource.medicationReference?.display}
  <strong>{resource.medicationReference?.display}</strong>
  <br>
{/if}

{#if resource.reasonReference?.[0].display}
  {resource.reasonReference?.[0].display}<br>
{/if}

<Dosage dosages={resource.dosage} />

Effective: <Date fields={{ period: resource.effectivePeriod, dateTime: resource.effectiveDateTime }} />
