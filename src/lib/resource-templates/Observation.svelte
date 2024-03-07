<script>
  import { Card, CardBody, Col, Row } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component
</script>

<Card>
  <CardBody>
    <Row>
      <Col>
        Name:
        {#if resource.code && resource.code.coding}
          {resource.code.coding[0].display}
          ({resource.code.coding[0].code})
        {/if}
        {#if resource.code && resource.code.text}
          [Uncoded text shown]: {resource.code.text}
        {/if}
      </Col>
      <Col>
        Date:
        {#if resource.effectiveDateTime}
          {resource.effectiveDateTime}
        {/if}
      </Col>
    </Row>
    <Row>
      <Col>
        Value:
        {#if resource.valueCodeableConcept}
          {resource.valueCodeableConcept.coding[0].display}
        {/if}
        {#if resource.valueQuantity}
          {resource.valueQuantity.value} {resource.valueQuantity.unit}
        {/if}
        {#if resource.valueString}
          {resource.valueString}
        {/if}
      </Col>
      {#if resource.category && resource.category[0] && resource.category[0].coding && resource.category[0].coding[0]}
        <Col>Category: {resource.category[0].coding[0].code}</Col>
      {/if}
    </Row>
  </CardBody>
</Card>
