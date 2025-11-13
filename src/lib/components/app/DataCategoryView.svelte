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
  import { getContext } from 'svelte';
  import { get, type Writable } from 'svelte/store';
  import { METHOD_SYSTEM, SOURCE_NAME_SYSTEM } from '$lib/config/config';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import FHIRResourceList from '$lib/components/app/FHIRResourceList.svelte';
  import type { DataFormConfig } from '$lib/utils/types';

  // Top-level title and description
  export let title: string | undefined;
  export let description: string | undefined;
  
  export let category: string;
  
  export let forms: DataFormConfig[];
  
  export let submitting: boolean;
  export let currentTab: string;

  export let showAdd: boolean;

  export let activeTab: string;

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let userResources = fhirDataService.userResources;
  let loading = fhirDataService.loading;
  
  let mode: Writable<string> = getContext('mode');
  
  let methodList: string[];
  let addDataActiveOnLoad = showAdd || !($userResources?.[category]);
  let accordionClass: string;
  $: if (forms) {
    methodList = forms.map(cat => cat.method);
    if (methodList?.length > 0) {
      accordionClass = "add-" + methodList[0];
    }
  }
  $: {
    if (activeTab) {
      document.querySelector(`span.${activeTab}-tab`)?.parentElement?.click();
    }
  }
</script>

{#if description}
  <p class="text-secondary"><em>{@html description}</em></p>
{/if}
<slot name="description"/>
<Accordion stayOpen class="mb-2">
  <AccordionItem
    class="my-data-accordion {accordionClass}"
    active={ showAdd || addDataActiveOnLoad }
  >
    <!-- <h5 slot="header" class="my-2">{editable ? "Enter or Edit Stored Data" : "Add New Data"}</h5> -->
    <h5 slot="header">Add or Update My Data</h5>
    {#if (forms.length > 1 && ($mode === "advanced" || forms.filter(form => !form.advanced).length > 1))}
      <TabContent on:tab={(e) => {
        currentTab = e.detail;
      }}>
      {#each forms as formConfig, index}
        {#if $mode === "advanced" || !formConfig.advanced }
        <TabPane class="{formConfig.method}-tab" tabId={formConfig.method} style="padding-top:10px" active={formConfig.method === activeTab || !activeTab && index === 0}>
          <span class="{formConfig.method}-tab" slot="tab">{formConfig.advanced ? "* " : ""}{formConfig.tabTitle || formConfig.title}</span>
          {#if formConfig.title}<h5 class="my-2">{formConfig.title}</h5>{/if}
          {#if formConfig.description}<p class="text-secondary"><em>{@html formConfig.description}</em></p>{/if}
          {#if formConfig.component}
            <svelte:component this={formConfig.component} disabled={!!$loading} on:update-resources on:sof-auth-init on:sof-auth-fail />
          {/if}
        </TabPane>
        {/if}
      {/each}
      </TabContent>
    {:else}
      {#if forms[0].title}<h5 class="my-2">{forms[0].title}</h5>{/if}
      {#if forms[0].description}<p class="text-secondary"><em>{@html forms[0].description}</em></p>{/if}
      {#if forms[0].component}
        <svelte:component this={forms[0].component} disabled={!!$loading} on:update-resources on:sof-auth-init on:sof-auth-fail />
      {/if}
    {/if}
    {#if $mode === "advanced" && forms.some(form => form.advanced)}
      <br>
      <em class="text-secondary">* Advanced feature for demo purposes only</em>
      <br>
    {/if}
  </AccordionItem>
</Accordion>
{#if $userResources?.[category] && methodList?.length > 0 }
<Accordion stayOpen>
  <AccordionItem
    class="my-data-accordion"
    active
  >
    <h5 slot="header">Data Retrieved From...</h5>
  {#if $userResources[category]}
    <div class="d-flex justify-content-end align-items-center flex-nowrap w-100 p-2 bg-light rounded-top border-top border-start border-end">
      <div class="ms-3 flex-shrink-0">
        <Button
          size="sm"
          color="secondary"
          outline
          on:click={(event) => {
            const accordionButtons = document.querySelectorAll(`div.${category}-dataset:not(:has(div.accordion-collapse.show)) > h2 > button.accordion-button`);
            for (const accordionButton of Array.from(accordionButtons)) {
              accordionButton.click();
            }
          }}
        >
          Open All
        </Button>
      </div>
      <div class="ms-3 flex-shrink-0">
        <Button
          size="sm"
          color="secondary"
          outline
          on:click={(event) => {
            const accordionButtons = document.querySelectorAll(`div.${category}-dataset:has(div.accordion-collapse.show) > h2 > button.accordion-button`);
            for (const accordionButton of Array.from(accordionButtons)) {
              accordionButton.click();
            }
          }}
        >
          Collapse All
        </Button>
      </div>
    </div>
    <Accordion stayOpen>
      {#each Object.entries($userResources[category]) as [source, dataset]}
        <AccordionItem active class="{category}-dataset">
          <div slot="header" class="d-flex justify-content-between align-items-center flex-nowrap w-100" style="max-width: calc(100% - 2.5rem);">
            <div class="flex-grow-1" style="min-width: 0">
              <h6
                class="mt-1"
                title={source}
                style="max-width: 100%; overflow-wrap: anywhere;"
              >
                {get(dataset.patient).meta.tag.find((tag) => tag.system === SOURCE_NAME_SYSTEM)?.code || source}
              </h6>
              <span style="max-width: 100%;">
                              Updated {new Date((get(dataset.patient)).meta.lastUpdated).toLocaleString(undefined, {
                              dateStyle: "medium",
                            })}</span>
            </div>
            <div class="ms-3 flex-shrink-0">
              <Button
                size="sm"
                color="secondary"
                outline
                on:click={(event) => {
                  event.stopPropagation();
                  const accordionButton = document.querySelector(`div.${accordionClass} > h2 > button.accordion-button`);
                  if (accordionButton) {
                    const openCollapse = document.querySelector(`div.${accordionClass} > div.accordion-collapse.show`);
                    if (openCollapse === null) {
                      accordionButton.click();
                    }
                    const offset = 72;
                    const elementTop = accordionButton.getBoundingClientRect().top + window.scrollY;
                    window.scrollTo({top: elementTop - offset-10, behavior: 'smooth'});
                    activeTab = get(dataset.patient).meta.tag.find((tag) => tag.system === METHOD_SYSTEM)?.code;
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
                on:click={(event) => {
                  event.stopPropagation();
                  fhirDataService.deleteDataset(category, source)
                }}
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
  </AccordionItem>
  </Accordion>
{/if}

<style>
  :global(div.my-data-accordion > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-accordion-active-bg) !important;
  }
</style>
