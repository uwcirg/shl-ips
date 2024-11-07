<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { MedicationStatement } from "fhir/r4";
  import Dosage from '$lib/components/resource-templates/Dosage.svelte';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  
  export let resource: MedicationStatement; // Define a prop to pass the data to the component
</script>

<Badge color={resource.status === "stopped" ? "secondary" : "primary"}>{resource.status ? `${resource.status}` : ''}</Badge>

<CodeableConcept codeableConcept={resource.medicationCodeableConcept} />

{#if resource.medicationReference?.display}
  <br>
  <strong>{resource.medicationReference?.display}</strong>
  <br>
{/if}

{#if resource.reasonReference?.[0].display}
  {resource.reasonReference?.[0].display}<br>
{/if}

{#if resource.effectivePeriod?.start}
  Effective {resource.effectivePeriod.start}{resource.effectivePeriod.end
    ? ` - ${resource.effectivePeriod.end}`
    : ''}
{:else if resource.effectiveDateTime}
  {resource.effectiveDateTime ? `Effective date: ${resource.effectiveDateTime.split("T")[0]}` : ''}
{/if}

<Dosage dosage={resource.dosage?.[0]} />