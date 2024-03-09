<script>
  import { Badge } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

{#if resource.code && resource.code.coding}
    <Badge color="primary">{resource.code.coding[0].system} : {resource.code.coding[0].code}</Badge>
    <br />
    {#if resource.code.coding[0].display}
        <strong>{resource.code.coding[0].display}</strong>
    {:else if resource.code && resource.code.text}
        <strong>{resource.code.text}</strong>
    {/if}
    <br>
{:else if resource.code && resource.code.text}
    <strong>{resource.code.text}</strong>
    <br>
{/if}
{#if resource.effectivePeriod}
    Effective {resource.effectivePeriod.start}{resource.effectivePeriod.end
    ? ` - ${resource.effectivePeriod.end}`
    : ''}
{:else if resource.effectiveDateTime}
    Date: {resource.effectiveDateTime.split("T")[0]}
{/if}
<br>
{#if resource.result}
    <table class="table table-bordered table-sm">
        <thead>
        <tr><th colspan="5">Result(s)</th></tr>
        </thead>
        {#each resource.result as result}
        <tr>
            <td>{result.display}</td>
        </tr>
        {/each}
    </table>
{/if}
