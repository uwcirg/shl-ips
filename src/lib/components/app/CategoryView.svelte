<script lang="ts">
  import {
    Button,
    Card,
    CardBody,
    CardHeader,
    Icon
  } from '@sveltestrap/sveltestrap';

  let className = '';
  export { className as class };

  export let title: string = "";
  export let seeAllFn: (() => any) | undefined = undefined;
  export let addFn: (() => any) | undefined = undefined;
  // The title element, bindable so a page can scroll to it (e.g. from a SectionNav)
  export let titleElement: HTMLElement | undefined = undefined;

</script>
<Card class={className}>
  <CardHeader>
    <div class="d-flex justify-content-between">
      <h5 bind:this={titleElement}>{title}</h5>
      <div class="d-flex gap-2">
        {#if addFn}
          <Button outline size="sm" color="secondary" style="border: 1px dashed" on:click={addFn}><Icon name="plus" /> Add</Button>
        {/if}
        {#if seeAllFn}
          <Button outline size="sm" color="secondary" on:click={seeAllFn}>See all <Icon name="chevron-right" /></Button>
        {/if}
      </div>
    </div>
  </CardHeader>
  <CardBody>
    <slot name="resources" />

  </CardBody>
</Card>
