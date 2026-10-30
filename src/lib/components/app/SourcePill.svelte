<script lang="ts">
  import { Card, CardBody, Col, Row } from '@sveltestrap/sveltestrap';
  let className = '';
  export { className as class };

  export let name;
  export let color = undefined;
  // Set to make the pill a toggle button; leave undefined for a plain label
  export let selected: boolean | undefined = undefined;
  // Pills without a color (e.g. section filters) have no dot
  export let showDot = color !== undefined;

  $: interactive = selected !== undefined;
</script>

<svelte:element
  this={interactive ? 'button' : 'div'}
  type={interactive ? 'button' : undefined}
  aria-pressed={interactive ? selected : undefined}
  class="pill-wrapper p-0 border-0 bg-transparent text-start"
  class:interactive
  style="max-width: 100%; min-width: 0;"
  on:click
>
  <Card
    class={"rounded-5 " + className}
    style="max-width: 100%; min-width: 0;"
    color={selected ? 'primary' : undefined}
    outline={selected}
  >
    <CardBody class="py-1 px-3">
      <Row class="flex-nowrap">
        {#if showDot}
          <Col class="col-auto pe-0 d-flex align-items-center">
            <span
              class="d-inline-block rounded-circle"
              style="width:10px; height:10px; background-color:{color};"
            ></span>
          </Col>
        {/if}
        <Col class="text-truncate d-flex align-items-center" style={"min-width: 0;" + (showDot ? " padding-left: 0.5rem;" : "")}>
          <small class:text-secondary={!selected} class:text-primary={selected} class:fw-semibold={selected}>{name}</small>
        </Col>
      </Row>
    </CardBody>
  </Card>
</svelte:element>

<style>
  .pill-wrapper.interactive {
    cursor: pointer;
  }
</style>