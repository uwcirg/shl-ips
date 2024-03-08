<script>
  import { Badge, Card, CardBody, Col, Row } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

<Badge color="primary">{resource.category[0].coding[0].code}</Badge>
{#if resource.code && resource.code.coding}
  <Badge color="primary">{resource.code.coding[0].system} : {resource.code.coding[0].code}</Badge>
  <br>
  <strong>{resource.code.coding[0].display}:</strong>
{:else if resource.code.text}
  {resource.code.text}: 
{/if}
<strong>
  {#if resource.valueCodeableConcept}
    {resource.valueCodeableConcept.coding[0].display}
  {/if}
  {#if resource.valueQuantity}
    {resource.valueQuantity.value} {resource.valueQuantity.unit}
  {/if}
  {#if resource.valueString}
    {resource.valueString}
  {/if}
</strong>
<br>
Date: {resource.effectiveDateTime ? `${resource.effectiveDateTime.split("T")[0]}` : ''}
<br>
