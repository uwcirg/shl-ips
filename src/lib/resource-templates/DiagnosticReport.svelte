<script>
  import { Badge, Card, CardBody } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

{#if resource.code && resource.code.coding && resource.code.coding[0]}
    <Badge color="primary">{resource.code.coding[0].system} : {resource.code.coding[0].code}</Badge>
    <br />
    <strong>{resource.code.coding[0].display}</strong>
{:else if resource.code && resource.code.text}
    <strong>{resource.code.text}</strong>
{/if}
<br>
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
