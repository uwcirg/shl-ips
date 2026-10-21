<script lang="ts">
  import type { CodeableConcept as FhirCodeableConcept, Encounter } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import Date from '$lib/components/resource-templates/Date.svelte';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import { choiceDTFields } from '$lib/utils/util';
  
  export let content: ResourceTemplateParams<Encounter>; // Define a prop to pass the data to the component

  let resource: Encounter;
  $: if (content) resource = content.resource;

  const conceptText = (concept?: FhirCodeableConcept) =>
    concept?.text ?? concept?.coding?.find((coding) => coding.display)?.display;

  // Types such as "Inpatient", "Hospital Encounter", "Urgent", without repeats
  $: types = [...new Set((resource?.type ?? []).map(conceptText).filter((text): text is string => !!text))];

  // Locations are often repeated (e.g. once with a period, once without), so list each name once
  $: locations = [...new Set((resource?.location ?? []).map((loc) => {
    const name = loc.location?.display;
    if (!name) return undefined;
    const kind = conceptText(loc.physicalType);
    return kind ? `${kind} ${name}` : name;
  }).filter((name): name is string => !!name))];

  $: participants = (resource?.participant ?? [])
    .map((participant) => ({
      name: participant.individual?.display,
      role: conceptText(participant.type?.[0])
    }))
    .filter((participant) => participant.name)
    // The same person is often listed once per role
    .filter((participant, index, all) =>
      all.findIndex((other) => other.name === participant.name && other.role === participant.role) === index
    );

  $: disposition = conceptText(resource?.hospitalization?.dischargeDisposition);
</script>

{#if types.length > 0}
  <strong>{types.join(', ')}</strong><br>
{/if}
{#if resource.class?.display}
  Class: {resource.class.display}<br>
{/if}
{#if resource.serviceType}
  Service: {conceptText(resource.serviceType)}<br>
{/if}
{#if resource.reasonCode?.length}
  Reason:
  {#each resource.reasonCode as reason}
    <CodeableConcept codeableConcept={reason} />
  {/each}
{/if}
{#if resource.period}
  Date: <Date fields={choiceDTFields("period", resource)} /><br>
{/if}
<br>
{#if disposition}
  Discharge disposition: {disposition}<br>
{/if}
{#if locations.length > 0}
  Location: {locations.join(', ')}<br>
{/if}
{#if resource.serviceProvider?.display}
  Provider: {resource.serviceProvider.display}<br>
{/if}
{#each participants as participant}
  {participant.role ? `${participant.role[0].toUpperCase()}${participant.role.slice(1)}` : 'Participant'}: {participant.name}<br>
{/each}
