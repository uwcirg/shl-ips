<script lang="ts">
  import type { Observation } from "fhir/r4";
    import type { ResourceTemplateParams } from '$lib/utils/types';
    import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
    import DateLine from '$lib/components/resource-templates/DateLine.svelte';
      import { hasChoiceDTField, choiceDTFields } from "$lib/utils/util";
    
    export let content: ResourceTemplateParams<Observation>; // Define a prop to pass the data to the component
    let resource: Observation;
    $: if (content) resource = content.resource;
  </script>

  {#if resource.code?.coding?.[0].code}
    {#if resource.code.coding[0].code === "74165-2"}
        <strong>Employment Status</strong><br>
        <CodeableConcept codeableConcept={resource.valueCodeableConcept} />
        {#if hasChoiceDTField("effective", resource)}
            <DateLine period fields={choiceDTFields("effective", resource)} />
        {/if}
    {:else if resource.code.coding[0].code === "87510-4"}
        <strong>Retired</strong>
        {#if resource.valueDateTime}
            <DateLine period fields={{dateTime: resource.valueDateTime}} />
        {/if}
    {:else if resource.code.coding[0].code === "87511-2"}
        <strong>Combat Zone/Hazardous Work Period</strong>
        {#if resource.valuePeriod}
            <DateLine period fields={{period: resource.valuePeriod}} />
        {/if}
    {:else if resource.code.coding[0].code === "11341-5"}
        <strong>
            Job History
            {resource.extension?.find(function (e) {
                return e.url === "http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension" && e.valueBoolean;
            }) ? " (Current)" : "(Past)"}
        </strong><br>
        <CodeableConcept codeableConcept={resource.valueCodeableConcept} />
        {#if resource.component}
            {#each resource.component as component}
                <CodeableConcept codeableConcept={component.valueCodeableConcept} />
                {#if component.valueQuantity && component.code?.coding}
                    {component.valueQuantity.value}{
                        component.valueQuantity.unit ?? ""
                    }{component.code.coding[0].code === "74160-3"
                        ?"/week"
                        : (component.code.coding[0].code === "87512-0"
                            ? "/day"
                            : "")}
                {/if}
                {#if component.valueString && component.code?.coding}
                    {component.code.coding[0].code === "87729-0"
                        ? "Hazard:"
                        : ""
                    }{component.valueString}
                {/if}
            {/each}
        {/if}
        {#if hasChoiceDTField("effective", resource)}
            <DateLine period fields={choiceDTFields("effective", resource)} />
        {/if}
    <!-- {:else if resource.code.coding[0].code === "21843-8"} -->
        
    {/if}
  {/if}
  