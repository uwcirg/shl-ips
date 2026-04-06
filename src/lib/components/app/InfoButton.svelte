<script lang="ts">
  import { randomStringWithEntropy } from '$lib/utils/util';
  import { Icon, Tooltip, Row, Col } from '@sveltestrap/sveltestrap';
  import { onMount } from 'svelte';

  export let hover = false;
  export let active = false;

  function toggle() {
    active = !active;
  }

  function hide() {
    active = false;
  }

  const hash = randomStringWithEntropy();

  onMount(() => {
    window.addEventListener('click', hide);
    return () => {
      window.removeEventListener('click', hide);
    }
  })

  function cancelIfHover(event: Event) {
    if (hover) return;
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

</script>

<button
  id="info-circle-{hash}"
  class="info-circle p-0"
  on:mouseover={(event) => {
    cancelIfHover(event);
  }}
  on:focus={(event) => {
    // cancelIfHover(event);  
  }}
  on:mouseleave={(event) => {
    cancelIfHover(event);
  }}
  on:mousedown={(event) => {
    cancelIfHover(event);
    toggle();
  }}
  on:click={(event) => {
    event.stopPropagation();
  }}
><Icon name="info-circle"/></button>
<Tooltip placement="right" bind:isOpen={active} target="info-circle-{hash}" container="inline" class="mx-2">
  <div class="{hover ? "" : "me-3"}" style="user-select: none">
    {#if !hover}
      <Icon name="x" style="position: absolute; top: 0; right: 3px; cursor: pointer;" on:click={hide} />
    {/if}
    <slot name="content" />
  </div>
</Tooltip>

<style>
  button.info-circle {
    border: none;
    background-color: transparent;
    width: min-content;
    height: min-content;
    cursor: pointer;
    max-height: min-content;
    max-width: min-content;
    color: var(--bs-primary);
    font-size: large;
  }
  button.info-circle:hover {
    -webkit-text-stroke: 0.5px ;
  }
  /* :global(.tooltip-arrow) {
  }
  :global(.tooltip-inner) {
    background-color: white !important;
    border: 1px solid var(--bs-primary) !important;
  } */
</style>