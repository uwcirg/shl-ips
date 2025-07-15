<script lang="ts">
  import type { BundleEntry, Observation } from "fhir/r4";
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import { getEntry } from '$lib/utils/util';
  import OccupationalData from '$lib/components/resource-templates/OccupationalData.svelte';
  import { hasChoiceDTField, choiceDTFields } from '$lib/utils/util';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';
  
  export let content: ResourceTemplateParams<Observation>; // Define a prop to pass the data to the component
  export let contained: Boolean = false;

  let resource: Observation;
$: if (content) resource = content.resource;

  const odhResourceCodes = [
    "74165-2", // Employment status
    "87510-4", // Retirement date
    "87511-2", // Combat zone period
    "11341-5", // Job history
    "21843-8", // Usual work
  ];

  // handle Observation.hasMember references
  interface ResolvedMember {
    resource?: Observation;
    display?: string;
  }
  let members: ResolvedMember[] | undefined = [];

$: {
  if (resource) {
    if (resource.hasMember) {
      for (let member of resource.hasMember) {
        let memberFields: ResolvedMember = {};
        if (member.reference) {
          let memberResource;
          if (resource.contained?.[0]?.resourceType === 'Observation') {
            // If the member observation is contained in this resource
            memberResource = resource.contained[0];
          } else {
            // If the member observation is a bundle reference
            memberResource = getEntry(content.entries as BundleEntry[], member.reference) as Observation;
          }
          if (memberResource) {
            memberFields.resource = memberResource;
          }
        }
        if (member.display) {
          memberFields.display = member.display;
        }
        if (Object.keys(memberFields).length > 0) {
          members.push(memberFields);
        }
      }
    }
  }
}
</script>

{#if odhResourceCodes.includes(resource.code?.coding?.[0].code ?? "")}
  <OccupationalData {content} />
{:else}
  {#if resource.code}
    <CodeableConcept codeableConcept={resource.code} />
  {/if}
  {#if resource.valueCodeableConcept?.coding?.[0].display}
    {resource.valueCodeableConcept.coding[0].display}<br>
  {/if}
  {#if resource.valueQuantity}
    {resource.valueQuantity.value ?? ""} {resource.valueQuantity.unit ?? ""}<br>
  {/if}
  {#if resource.valueString}
    {resource.valueString ?? ""}<br>
  {/if}
  {#if resource.note}
  {#each resource.note as note}
    {#if note.text}
      Note: {note.text}<br>
    {/if}
  {/each}
  {/if}
  {#if !(resource.valueCodeableConcept || resource.valueQuantity || resource.valueString)}
    <br>
  {/if}
  {#if members.length > 0}
  <table class="table table-bordered table-sm">
    <thead>
      <tr><th>Result(s)</th></tr>
    </thead>
    <tbody>
    {#each members as member}
      <tr>
        <div class="mx-4">
          {#if member.resource}
            <svelte:self
              content={{ resource: member.resource, entries: content.entries }}
              contained={hasChoiceDTField("effective", resource)}
            />
          {:else if member.display}
            <strong>{member.display}</strong>
          {/if}
        </div>
      </tr>
    {/each}
    </tbody>
  </table>
  {/if}
  {#if !contained && hasChoiceDTField("effective", resource)}
    Date: <Date fields={choiceDTFields("effective", resource)} />
  {/if}
{/if}
