<script lang="ts">
  import { Row, Col, Image } from 'sveltestrap';
  export let title = 'International Patient Summary';
</script>

<Row
  style="
    padding:0px 12px;
    margin-left: 0px;
    margin-right: 0px;
    margin-bottom: 20px;
    border-bottom: 1px solid rgb(204, 204, 204);"
  class="d-flex justify-content-between align-items-center"
>
  <Col style="max-width: 200px">
    <Image
      alt="WA Verify Logo"
      width="200"
      src="/img/waverifypluslogo.svg"
      style="align-self: center"
    />
  </Col>
  <Col>
    <div
      style="
      vertical-align: middle;
      font-size: 18px;
      display: inline-block;
      padding-left: 17px;
      font-family: Verdana, sans-serif;
      color: rgb(34, 72, 156);"
    >
      {title}
    </div>
  </Col>
</Row>
