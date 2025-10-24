<script lang="ts">
  import { Accordion,
    AccordionItem,
    Button,
    Card,
    CardBody,
    CardHeader,
    CardFooter,
    Col,
    Row,
    TabContent,
    TabPane
  } from 'sveltestrap';
  import { createEventDispatcher, getContext, onMount, tick } from 'svelte';
  import { get, type Writable } from 'svelte/store';
  import { SOURCE_NAME_SYSTEM } from '$lib/config/config';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import FHIRResourceList from '$lib/components/app/FHIRResourceList.svelte';
  import type { DataCategoryConfig } from '$lib/utils/types';

  // Top-level title and description
  export let title: string | undefined;
  export let description: string | undefined;
  
  export let categories: DataCategoryConfig[];
  
  export let submitting: boolean;
  export let currentTab: string;

  export let showAdd: boolean;

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let userResources = fhirDataService.userResources;
  
  let mode: Writable<string> = getContext('mode');

  const dispatch = createEventDispatcher();
  function forward(event) {
    dispatch(event.type, event.detail);
  }
  
  let categoryList: string[];
  let addDataActiveOnLoad = showAdd;
  let accordionClass: string;
  $: if (categories) {
    categoryList = categories.map(cat => cat.category);
    if (categoryList?.length > 0) {
      accordionClass = "add-" + categoryList[0];
      if ($userResources) {
        addDataActiveOnLoad = !(categoryList.some(cat => $userResources?.[cat]));
      }
    }
  }
</script>

{#if description}
  <p class="text-secondary"><em>{description}</em></p>
{/if}
<slot name="description"/>
<Accordion stayOpen class="mb-2">
  <AccordionItem
    class="my-data-accordion {accordionClass}"
    active={ showAdd || addDataActiveOnLoad }
  >
    <!-- <h5 slot="header" class="my-2">{editable ? "Enter or Edit Stored Data" : "Add New Data"}</h5> -->
    <h5 slot="header">Add or Update My Data</h5>
    {#if (categories.length > 1)}
      <TabContent on:tab={(e) => {
        currentTab = e.detail;
      }}>
      {#each categories as categoryConfig, index}
        {#if $mode === "advanced" || !categoryConfig.advanced }
        <TabPane class="{categoryConfig.category}-tab" tabId={categoryConfig.category} style="padding-top:10px" active={index === 0}>
          <span class="{categoryConfig.category}-tab" slot="tab">{categoryConfig.advanced ? "* " : ""}{categoryConfig.tabTitle || categoryConfig.title}</span>
          {#if categoryConfig.title}<h5 class="my-2">{categoryConfig.title}</h5>{/if}
          {#if categoryConfig.description}<p class="text-secondary"><em>{categoryConfig.description}</em></p>{/if}
          <svelte:component this={categoryConfig.component} on:*={forward} />
        </TabPane>
        {/if}
      {/each}
      </TabContent>
    {:else if (categories.length === 1)}
      {#if categories[0].title}<h5 class="my-2">{categories[0].title}</h5>{/if}
      {#if categories[0].description}<p class="text-secondary"><em>{categories[0].description}</em></p>{/if}
      <svelte:component this={categories[0].component} on:*={forward} />
    {/if}
  </AccordionItem>
  </Accordion>
  {#if !addDataActiveOnLoad && categoryList?.length > 0 }
  <Accordion stayOpen>
    <AccordionItem
      class="my-data-accordion"
      active
    >
      <h5 slot="header">My Stored Data</h5>
    {#each categoryList as category, index}
      {#if $userResources[category]}
        <Accordion stayOpen>
          {#each Object.entries($userResources[category]) as [source, dataset]}
            <AccordionItem active>
              <div slot="header" class="d-flex align-items-center w-100" style="max-width: calc(100% - 2.5rem);">
                <div class="flex-grow-1" style="min-width: 0">
                  <h6
                    class="mt-1"
                    title={source}
                    style="max-width: 100%; overflow-wrap: anywhere;"
                  >
                    {get(dataset.patient).meta.tag.find((tag) => tag.system === SOURCE_NAME_SYSTEM)?.code || source}
                  </h6>
                </div>
              </div>
              <div class="p-2 mx-0 d-flex flex-fill justify-content-between align-items-center flex-nowrap w-100 rounded-top bg-light border-top border-left border-right">
                <div class="flex-grow-1" style="min-width: 0">
                  <span style="max-width: 100%;">
                    Updated {new Date((get(dataset.patient)).meta.lastUpdated).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}</span>
                </div>
                <div class="ms-3 flex-shrink-0">
                  <Button
                    size="sm"
                    color="secondary"
                    outline
                    on:click={() => {
                      const accordionButton = document.querySelector(`div.${accordionClass} > h2 > button.accordion-button`);
                      if (accordionButton) {
                        const openCollapse = document.querySelector(`div.${accordionClass} > div.accordion-collapse.show`);
                        if (openCollapse === null) {
                          accordionButton.click();
                        }
                        const offset = 72;
                        const elementTop = accordionButton.getBoundingClientRect().top + window.scrollY;
                        window.scrollTo({top: elementTop - offset-10, behavior: 'smooth'});
                      }
                    }}
                  >
                    Update
                  </Button>
                </div>
                <div class="ms-3 flex-shrink-0">
                  <Button
                    size="sm"
                    color="danger"
                    outline
                    on:click={() => fhirDataService.deleteDataset(category, source)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              <FHIRResourceList
                bind:resourceCollection={dataset}
                bind:submitting={submitting}
                on:status-update={ ({ detail }) => { /*updateStatus(detail)*/ } }
                on:error={ ({ detail }) => { /*showError(detail)*/ } }
              />
            </AccordionItem>
          {/each}
        </Accordion>
      {/if}
    {/each}
    </AccordionItem>
    </Accordion>
  {/if}

<style>
  :global(div.my-data-accordion > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-accordion-active-bg) !important;
  }
</style>
