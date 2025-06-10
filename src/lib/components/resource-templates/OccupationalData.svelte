<script lang="ts">
    import type { Observation } from "fhir/r4";
    import type { ResourceTemplateParams } from '$lib/utils/types';
    import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
    import Date from '$lib/components/resource-templates/Date.svelte';
    import { hasChoiceDTField, choiceDTFields } from "$lib/utils/util";
    
    export let content: ResourceTemplateParams<Observation>; // Define a prop to pass the data to the component
    let resource: Observation = content.resource;
  </script>

  {#if resource.code?.coding?.[0].code}
    {#if resource.code.coding[0].code === "74165-2"}
        <strong>Employment Status</strong><br>
        <CodeableConcept codeableConcept={resource.valueCodeableConcept} />
        {#if hasChoiceDTField("effective", resource)}
            <Date period fields={choiceDTFields("effective", resource)} />
        {/if}
    {:else if resource.code.coding[0].code === "87510-4"}
        <strong>Retired</strong>
        {#if resource.valueDateTime}
            <br><Date period fields={{dateTime: resource.valueDateTime}} />
        {/if}
        <br>
    {:else if resource.code.coding[0].code === "87511-2"}
        <strong>Combat Zone/Hazardous Work Period</strong><br>
        {#if resource.valuePeriod}
            <Date period fields={{period: resource.valuePeriod}} /><br>
        {/if}
    {:else if resource.code.coding[0].code === "11341-5"}
        <strong>
            Job History
            {resource.extension?.find(function (e) {
                return e.url === "http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension" && e.valueBoolean;
            }) ? " (Current)" : ""}
        </strong><br>
        {#if hasChoiceDTField("effective", resource)}
            <Date period fields={choiceDTFields("effective", resource)} /><br>
        {/if}
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
    <!-- {:else if resource.code.coding[0].code === "21843-8"} -->
        
    {/if}
  {/if}
  