<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { MedicationRequest } from "fhir/r4";
  import Dosage from '$lib/components/resource-templates/Dosage.svelte';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  
  export let resource: MedicationRequest; // Define a prop to pass the data to the component
</script>

<Badge color={resource.status === "stopped" ? "secondary" : "primary"}>{resource.status ? `${resource.status}` : ''}</Badge>
<Badge color="secondary">{resource.intent ? resource.intent : ''}</Badge>
<CodeableConcept codeableConcept={resource.medicationCodeableConcept} />
{#if resource.dispenseRequest?.validityPeriod}
    Valid from {resource.dispenseRequest?.validityPeriod.start}{resource.dispenseRequest?.validityPeriod.end
    ? ` - ${resource.dispenseRequest?.validityPeriod.end}`
    : ''}
    <br>
{/if}

<Dosage dosage={resource.dosageInstruction?.[0]} />