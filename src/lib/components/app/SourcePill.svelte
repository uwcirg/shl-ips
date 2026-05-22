<script lang="ts">
  import { Card, CardBody, Col, Row } from '@sveltestrap/sveltestrap';
  let className = '';
  export { className as class };

  export let name;
  export let color;
</script>

<Card class={"rounded-5 " + className} style="max-width: 100%; min-width: 0;">
  <CardBody class="py-1 px-3">
    <Row class="flex-nowrap">
      <Col class="col-auto pe-0">
        <span
          class="d-inline-block rounded-circle"
          style="width:10px; height:10px; background-color:{color};"
        ></span>
      </Col>
      <Col class="text-truncate" style="padding-left: 0.5rem; min-width: 0;">
        <small class="text-secondary">{name}</small>
      </Col>
    </Row>
  </CardBody>
</Card>