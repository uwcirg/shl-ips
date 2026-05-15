<script lang="ts">
  import {
    Button,
    Card,
    CardBody,
    Col,
    Icon,
    Row,
  } from '@sveltestrap/sveltestrap';
  import { createEventDispatcher, getContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { type Writable } from 'svelte/store';
  import type { DataFormConfig } from '$lib/utils/types';
  import { SvelteComponent } from 'svelte';

  const formDispatch = createEventDispatcher<{'show-form': {
    form: DataFormConfig,
    category: string
  }}>();

  // Top-level description
  export let title: string | SvelteComponent | undefined;
  export let description: string | undefined;
  
  export let category: string;
  
  export let forms: DataFormConfig[];
  
  export let submitting: boolean;
  export let currentTab: string;

  export let showAdd: boolean;

  export let activeTab: string;
  
  let mode: Writable<string> = getContext('mode');

  $: {
    if (activeTab) {
      document.querySelector(`span.${activeTab}-tab`)?.parentElement?.click();
    }
  }

</script>

<Card id={category} class="my-3 p-2">
  <CardBody>
    <h5>
      {#if typeof title === 'string' }
        {title}
      {:else if title instanceof SvelteComponent}
        <svelte:component this={title}/>
      {/if}
    </h5>
    <Row>
      <Col class="d-flex justify-content-start" style="max-width: fit-content">
        {#if description}
          <p class="text-secondary mb-0"><em>{@html description}</em></p>
        {/if}
          <slot name="description"/>
      </Col>
    </Row>
    
    {#if (forms.length > 0 && ($mode === "advanced" || forms.filter(form => !form.advanced).length > 0))}
      <Row class="g-4 mt-0">
      {#each forms as formConfig, index}
        {#if $mode === "advanced" || !formConfig.advanced }
          <!-- Show the form -->
          <Col class={index === 0 ? "col-12" : ""}>
            <Button
              id={formConfig.method}
              class="h-100 w-100 d-flex align-items-top flex-column justify-content-between shadow-sm"
              style="text-align: left;"
              outline
              color={ index === 0 ? "primary" : "secondary"}
              on:click={() => {
                goto(`/data/add/${category}/${formConfig.method}`);
                formDispatch('show-form', { category, form: formConfig });
              }}
            >
              <Row>
                <h5><strong>{formConfig.title ?? formConfig.tabTitle}{formConfig.advanced ? " *" : ""}</strong></h5>
                <!-- {#if formConfig.title}<h5 class="my-2">{formConfig.title}</h5>{/if} -->
                {#if formConfig.description}<span>{@html formConfig.description}</span>{/if}
              </Row>
              <Row>
                <Col class="d-flex justify-content-end">
                  <Icon name="chevron-right" />
                </Col>
              </Row>
            </Button>
          </Col>
        {/if}
      {/each}
      </Row>
    {/if}
    {#if $mode === "advanced" && forms.some(form => form.advanced)}
      <Row class="mt-3">
        <em class="text-secondary">* Advanced feature for demo purposes only</em>
      </Row>
    {/if}
  </CardBody>
</Card>

<style>
  :global(div.my-data-accordion > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-accordion-active-bg) !important;
  }
</style>
