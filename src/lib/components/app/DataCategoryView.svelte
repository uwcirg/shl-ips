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
  } from 'sveltestrap';
  import { getContext } from 'svelte';
  import { get } from 'svelte/store';
  import { DATA_CATEGORIES, SOURCE_NAME_SYSTEM } from '$lib/config/config';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import FHIRResourceList from '$lib/components/app/FHIRResourceList.svelte';
  
  export let title;
  export let description;
  export let category: string;
  export let editable: boolean = false;
  
  export let submitting: boolean;

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let userResources = fhirDataService.userResources;
</script>

{#if title}
<h4>{title}</h4>
{/if}
<slot name="title"/>

{#if description}
  <p class="text-secondary"><em>{description}</em></p>
{/if}
<slot name="description"/>
<Accordion stayOpen>
  <AccordionItem class="add" active={!($userResources && $userResources[category])}>
    <h5 slot="header" class="my-2">{editable ? "Enter or Edit Stored Data" : "Add New Data"}</h5>
    <slot name="form" />
  </AccordionItem>
  {#if $userResources && $userResources[category]}
  <AccordionItem active>
    <h5 slot="header" class="my-2">My Stored Data</h5>
    <Card>
      <CardHeader>
        <h6 class="mt-1">{DATA_CATEGORIES[category].title || category}</h6>
      </CardHeader>
      <CardBody>
        <Accordion>
        {#each Object.entries($userResources[category]) as [source, dataset]}
        <AccordionItem>
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
          <FHIRResourceList
            bind:resourceCollection={dataset}
            bind:submitting={submitting}
            on:status-update={ ({ detail }) => { /*updateStatus(detail)*/ } }
            on:error={ ({ detail }) => { /*showError(detail)*/ } }
          />
          <div class="p-2 mx-0 d-flex flex-fill justify-content-between align-items-center flex-nowrap w-100 rounded-bottom bg-light border-bottom border-left border-right">
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
                color="danger"
                outline
                on:click={() => fhirDataService.deleteDataset(category, source)}
              >
                Delete
              </Button>
            </div>
          </div>
        </AccordionItem>
        {/each}
        </Accordion>
      </CardBody>
    </Card>
  </AccordionItem>
  {/if}
</Accordion>