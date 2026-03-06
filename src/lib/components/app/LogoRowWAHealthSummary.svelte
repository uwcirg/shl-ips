<script lang="ts">
  import { Row, Col } from '@sveltestrap/sveltestrap';
  import { INSTANCE_CONFIG } from '$lib/config/instance_config';
</script>

<Row class="mb-4 g-4 justify-content-around">
  <Col style="max-width: fit-content">
    <img src={`${INSTANCE_CONFIG.imgPath}/uw-logo.png`} alt="UW CIRG Logo" style="width: auto; max-height: 60px;">
  </Col>
  <Col style="max-width: fit-content">
    <img src={`${INSTANCE_CONFIG.imgPath}/company-logo.png`} alt="WA DOH Logo" style="width: auto; max-height: 60px;">
  </Col>
  <Col style="max-width: fit-content">
    <img src={`${INSTANCE_CONFIG.imgPath}/hca-logo.svg`} alt="HCA Logo" style="width: auto; width: 270px;">
  </Col>
</Row>
