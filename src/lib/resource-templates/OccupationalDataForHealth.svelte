<script>
    import { Badge } from 'sveltestrap';
    export let resource; // Define a prop to pass the data to the component
  </script>

  {#if resource.code && resource.code.coding && resource.code.coding[0].code}
    {#if resource.code.coding[0].code === "74165-2"}
        <strong>Employment Status</strong>
        {#if resource.valueCodeableConcept?.coding?.[0].display}
            <br>{resource.valueCodeableConcept?.coding?.[0].display}
        {/if}
        <br>
        {#if resource.effectivePeriod?.start}
            {#if resource.effectivePeriod.end}
                From {resource.effectivePeriod.start} - {resource.effectivePeriod.end}
            {:else}
                Since {resource.effectivePeriod.start}
            {/if}
        {:else if resource.effectiveDateTime}
            Since {resource.effectiveDateTime.split("T")[0]}
        {/if}
    {:else if resource.code.coding[0].code === "87510-4"}
        <strong>Retirement Date</strong>
        {#if resource.valueDateTime}
            <br>{resource.valueDateTime}
        {/if}
        <br>
    {:else if resource.code.coding[0].code === "87511-2"}
        <strong>Combat Zone Period</strong>
        {#if resource.valuePeriod?.start}
            <br>
            {#if resource.valuePeriod.end}
                From {resource.valuePeriod.start} - {resource.valuePeriod.end}
            {:else}
                Since {resource.valuePeriod.start}
            {/if}
        {/if}
    {:else if resource.code.coding[0].code === "11341-5"}
        <strong>Job History</strong>
        <br>
        {#if resource.effectivePeriod?.start}
            {#if resource.effectivePeriod.end}
                From {resource.effectivePeriod.start} - {resource.effectivePeriod.end}
            {:else}
                Since {resource.effectivePeriod.start}
            {/if}
        {:else if resource.effectiveDateTime}
            Since {resource.effectiveDateTime.split("T")[0]}
        {/if}
        {#if resource.valueCodeableConcept}
            {#if resource.valueCodeableConcept.coding}
                <Badge color="primary">{resource.valueCodeableConcept.coding[0].system} : {resource.valueCodeableConcept.coding[0].code}</Badge>
                <br />
                {#if resource.valueCodeableConcept.coding[0].display}
                    {resource.valueCodeableConcept.coding[0].display}
                {:else if resource.valueCodeableConcept.text}
                    {resource.valueCodeableConcept.text}
                {/if}
            {:else if resource.valueCodeableConcept.text}
                {resource.valueCodeableConcept.text}
            {/if}
        {/if}
        {#if resource.component}
            {#each resource.component as component}
                <br>
                {#if component.valueCodeableConcept}
                    {#if component.valueCodeableConcept.coding}
                        <Badge color="primary">{component.valueCodeableConcept.coding[0].system} : {component.valueCodeableConcept.coding[0].code}</Badge>
                        <br />
                        {#if component.valueCodeableConcept.coding[0].display}
                            {component.valueCodeableConcept.coding[0].display}
                        {:else if component.valueCodeableConcept.text}
                            {component.valueCodeableConcept.text}
                        {/if}
                    {:else if component.valueCodeableConcept.text}
                        {component.valueCodeableConcept.text}
                    {/if}
                {/if}
                {#if component.valueQuantity}
                    {component.valueQuantity.value}{
                        component.valueQuantity.unit ?? ""
                    }{component.code.coding[0].code === "74160-3"
                        ?"/week"
                        : (component.code.coding[0].code === "87512-0"
                            ? "/day"
                            : "")}
                {/if}
                {#if component.valueString}
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
  