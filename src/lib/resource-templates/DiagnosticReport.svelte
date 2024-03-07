<script>
    import {
    Card,
    CardBody
  } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>
<Card>
    <CardBody>
        {#if resource.effectivePeriod}
            Effective {resource.effectivePeriod.start}{resource.effectivePeriod.end ? ` - ${resource.effectivePeriod.end}` : ""}
        {:else if resource.effectiveDateTime}
            Effective {resource.effectiveDateTime}
        {/if}
        {#if resource.code && resource.code.coding && resource.code.coding[0]}
            <span class="badge badge-primary">{resource.code.coding[0].system}</span>
            <br>
            {resource.code.coding[0].display} ({resource.code.coding[0].code})
        {:else if resource.code && resource.code.text}
            {resource.code.text}
        {/if}
        {#if resource.result}
            {#each resource.result as result}
                {#if result.display}
                    {result.display}<br>
                {/if}
            {/each}
        {/if}
    </CardBody>
</Card>