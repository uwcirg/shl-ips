<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import type { Writable } from 'svelte/store';
  import { Button, Col, Row } from '@sveltestrap/sveltestrap';
  import type { ResourceHelper } from '$lib/utils/ResourceHelper.js';
  import type { CategorizedResource } from '$lib/stores/categorizedResources';
  import ResourceDisplay from '$lib/components/app/ResourceDisplay.svelte';

  export let resources: CategorizedResource[];
  // All of the resources in the list, for displays that look up what a resource refers to
  export let entries: Array<{ resource: any }>;

  const dispatch = createEventDispatcher<{ view: ResourceHelper }>();
  let mode: Writable<string> = getContext('mode');
</script>

{#each resources as value, index}
  <Row class={index > 0 ? "border-top pt-2 mt-2" : ""} style="overflow: hidden">
    <Col class="overflow-auto justify-content-center align-items-center">
      <ResourceDisplay resource={value.rh.resource} renderInfo={value.renderInfo} {entries} codeBadges="advanced" />
    </Col>
    <Col class="d-flex justify-content-end align-items-center" style="max-width: fit-content">
      {#if $mode === 'advanced'}
        <Button
          size="sm"
          color="secondary"
          outline
          on:click={(event) => {
            event.stopPropagation();
            dispatch('view', value.rh);
          }}
        >
          View
        </Button>
      {/if}
    </Col>
  </Row>
{/each}
