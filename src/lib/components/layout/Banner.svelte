<script lang="ts">
  import { Row, Col, Image } from 'sveltestrap';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
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
  <Col style={`max-width:${INSTANCE_CONFIG.header.logo_width}px`}>
    <Image
      alt="WA Health Summary Logo"
      width={INSTANCE_CONFIG.header.logo_width}
      src={INSTANCE_CONFIG.header.logo}
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
