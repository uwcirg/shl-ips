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
  import { DATA_CATEGORIES } from '$lib/config/config';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import FHIRResourceList from '$lib/components/app/FHIRResourceList.svelte';
  import { Collapse } from 'bootstrap';
  
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
          <h6 slot="header" title={source} class="mt-1" style="max-width: 60ch; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{source}</h6>
          <FHIRResourceList
            bind:resourceCollection={dataset}
            bind:submitting={submitting}
            on:status-update={ ({ detail }) => { /*updateStatus(detail)*/ } }
            on:error={ ({ detail }) => { /*showError(detail)*/ } }
          />
          <Row class="p-2 mx-0 flex-fill rounded-bottom bg-light border-bottom border-left border-right">
            <Col class="col-10 d-flex justify-content-start align-items-center"> 
              <!-- <Button 
                size="sm"
                color="secondary"
                outline
                on:click={() => {
                  document.querySelector('.add .accordion-collapse')?.classList.add('show');
                }}
              >
                Update
              </Button>-->
            </Col>
            <Col class="col-2 d-flex justify-content-end align-items-center">
              <Button
                size="sm"
                color="danger"
                outline
                on:click={() => fhirDataService.deleteDataset(category, source)}
              >
                Delete
              </Button>
            </Col>
          </Row>
        </AccordionItem>
        {/each}
        </Accordion>
      </CardBody>
    </Card>
  </AccordionItem>
  {/if}
</Accordion>