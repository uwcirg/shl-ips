<script lang="ts">
  import { Accordion,
    AccordionItem,
    Badge,
    Button,
    ButtonGroup,
    Card,
    CardBody,
    CardHeader,
    CardFooter,
    CardTitle,
    CardSubtitle,
    CardText,
    Col,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Icon,
    Offcanvas,
    Row,
    TabContent,
    TabPane
  } from 'sveltestrap';
  import { getContext } from 'svelte';
  import { get, type Writable } from 'svelte/store';
  import { METHOD_SYSTEM, METHOD_NAMES, SOURCE_NAME_SYSTEM, PLACEHOLDER_SYSTEM } from '$lib/config/config';
  import { download } from '$lib/utils/util';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import FHIRResourceList from '$lib/components/app/FHIRResourceList.svelte';
  import type { DataFormConfig } from '$lib/utils/types';
  import type { ResourceCollection } from '$lib/utils/ResourceCollection';
    import { CATEGORY_SYSTEM } from '../../config/config';

  // Top-level description
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
  let masterPatient = fhirDataService.masterPatient;
  
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

  function showDataset(source: string, dataset: ResourceCollection) {
    let method = METHOD_NAMES[get(dataset.patient).meta.tag.find((tag) => tag.system === METHOD_SYSTEM)?.code]?.name;

    let sourceString = source ? source : "Unknown dataset";
    let methodString = method ? ` (${method})` : "";
    setContent(
      `${sourceString}${methodString}`,
      dataset
    );
  }
  function updateDataset(dataset: ResourceCollection) {
    // TODO: autofill source/data in form
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
  }
  function deleteDataset(category: string, source: string) {
    fhirDataService.deleteDataset(category, source)
  }

  let isOpen = false;
  let name = '';
  let date = '';
  let ocDataset: ResourceCollection;
  function setContent(viewName: string, viewDataset: ResourceCollection) {
    name = viewName;
    date = new Date((get(viewDataset.patient)).meta.lastUpdated).toLocaleString(undefined, {
      dateStyle: "medium",
    })
    ocDataset = viewDataset;
    isOpen = true;
  }
  function toggle() {
    isOpen = !isOpen;
  }
</script>

<Offcanvas
  {isOpen}
  {toggle}
  scroll
  header={name}
  placement="end"
  title={name}
  style="display: flex; overflow-y:hidden; height: 100dvh; max-width: calc(2 * var(--bs-offcanvas-width)); width: 80dvw; min-width: var(--bs-offcanvas-width);"
>
  <div class="
      d-flex
      justify-content-between
      align-items-center
      flex-nowrap
      w-100
      p-2
      bg-light
      rounded-top
      border-top
      border-start
      border-end"
    style="height: 50px"
  >
    <div class="flex-shrink-0">
      <Icon name="calendar-check"/> {date}
    </div>
    <div class="ms-3 flex-shrink-0">
      <Button
        size="sm"
        color="secondary"
        outline
        on:click={() => {
          const accordionButtons = document.querySelectorAll(`div.resource-content:not(:has(div.accordion-collapse.show)) > h2 > button.accordion-button`);
          for (const accordionButton of Array.from(accordionButtons)) {
            accordionButton.click();
          }
        }}
      >
        Open All
      </Button>
      <Button
        size="sm"
        color="secondary"
        outline
        on:click={() => {
          const accordionButtons = document.querySelectorAll(`div.resource-content:has(div.accordion-collapse.show) > h2 > button.accordion-button`);
          for (const accordionButton of Array.from(accordionButtons)) {
            accordionButton.click();
          }
        }}
      >
        Collapse All
      </Button>
    </div>
  </div>
  <div class="d-flex w-100" style="height: calc(100% - 100px);">
    <Col class="d-flex pe-0 h-100 w-100" style="overflow: auto">
      {#if ocDataset && isOpen}
        {#key isOpen}
        <FHIRResourceList
          bind:resourceCollection={ocDataset}
          bind:submitting={submitting}
          scroll={false}
          on:status-update={ ({ detail }) => { /*updateStatus(detail)*/ } }
          on:error={ ({ detail }) => { /*showError(detail)*/ } }
        />
        {/key}
      {/if}
    </Col>
  </div>
  <Row class="d-flex pe-0" style="height: 50px">
    <Col class="d-flex justify-content-start align-items-end" style="padding-top: 1rem">
      <!-- <ButtonGroup>
        <Button
          size="sm"
          outline
          color="secondary"
          on:click={() => download(name + '.json', json)}
        >
          <Icon name="download" /> Download
        </Button>
      </ButtonGroup> -->
      <Button
        size="sm"
        outline
        color="secondary"
        on:click={() => { isOpen = false; updateDataset(ocDataset) }}
      >
        <Icon name="arrow-repeat" /> Update
      </Button>
    </Col>
    <Col class="d-flex justify-content-end align-items-end" style="padding-top: 1rem">
      <Button
        size="sm"
        outline
        color="danger"
        on:click={() => { isOpen = false; deleteDataset(
          get(ocDataset.patient).meta.tag.find((tag) => tag.system === CATEGORY_SYSTEM)?.code,
          get(ocDataset.patient).meta.tag.find((tag) => tag.system === SOURCE_NAME_SYSTEM)?.code || get(ocDataset.patient).meta.source.split("#")[0]
        )}}
      >
        <Icon name="trash" /> Delete
      </Button>
    </Col>
  </Row>
</Offcanvas>

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
      <h5 slot="header">Data Previously Downloaded</h5>
      {#if $userResources[category]}
        <Row class="g-4 d-flex justify-content-start">
          {#each Object.entries($userResources[category]).sort((a, b) => new Date((get(b[1].patient))?.meta?.lastUpdated) - new Date((get(a[1].patient))?.meta?.lastUpdated)) as [source, dataset]}
            <Col xs="12" sm="6" lg="4" style="">
              <Card class="{category}-dataset h-100 w-100">
                <CardHeader>
                  <Row class="align-items-center">
                    <Col>
                      <CardText style="max-width: 100%;">
                        <Icon name="calendar-check"/> {new Date((get(dataset.patient)).meta.lastUpdated).toLocaleString(undefined, {
                          dateStyle: "medium",
                        })}
                      </CardText>
                    </Col>
                    <Col class="ps-0" style="max-width: fit-content">
                      <Dropdown>
                        <DropdownToggle tag="div">
                          <Icon name="three-dots-vertical"></Icon>
                        </DropdownToggle>
                        <DropdownMenu>
                          <DropdownItem on:click={() => showDataset(source, dataset)}><div class="d-flex justify-content-between w-100">View <Icon name="chevron-right"/></div></DropdownItem>
                          <DropdownItem class="text-primary"on:click={() => updateDataset(dataset)}><Icon name="arrow-repeat"/> Update</DropdownItem>
                          <DropdownItem divider />
                          <DropdownItem class="text-danger" on:click={() => deleteDataset(category, source)}><Icon name="trash"/> Delete</DropdownItem>
                        </DropdownMenu>
                      </Dropdown>
                    </Col>
                  </Row>
                </CardHeader>
                <CardBody class="d-flex flex-column justify-content-between">
                  <div>
                    <Row class="align-items-top">
                      <Col>
                        <CardTitle
                          title={source}
                          style="max-width: 100%; overflow-wrap: anywhere;"
                        >
                          {get(dataset.patient).meta.tag.find((tag) => tag.system === SOURCE_NAME_SYSTEM)?.code || source}
                        </CardTitle>
                      </Col>
                    </Row>
                    <Row>
                      <CardSubtitle class="mb-1 text-secondary">
                        For {
                          get(dataset.patient).meta.tag.find((tag) => tag.system === PLACEHOLDER_SYSTEM)?.code === 'placeholder-patient' ?
                            `${$masterPatient?.resource?.name?.[0]?.given?.join(" ")} ${$masterPatient?.resource?.name?.[0]?.family}` :
                            `${get(dataset.patient).name?.[0]?.given?.join(" ")} ${get(dataset.patient).name?.[0]?.family}`
                        }
                      </CardSubtitle>
                    </Row>
                    <Row>
                      <Col class="pe-0">
                        <Badge color="secondary">
                          {METHOD_NAMES[get(dataset.patient).meta.tag.find((tag) => tag.system === METHOD_SYSTEM)?.code]?.name || "Unknown"}
                        </Badge>
                      </Col>
                    </Row>
                  </div>
                  <Row class="mx-0 mt-3">
                    <Button class="d-flex justify-content-between align-items-center" color="secondary" outline on:click={() => showDataset((get(dataset.patient).meta.tag.find((tag) => tag.system === SOURCE_NAME_SYSTEM)?.code || source), dataset)}>
                      <Badge color="primary">{dataset.getResourceCount()}</Badge>
                      <div>View </div>
                      <Icon name="chevron-right"/>
                    </Button>
                  </Row>
                </CardBody>
              </Card>
            </Col>
          {/each}
        </Row>
      {/if}
    </AccordionItem>
  </Accordion>
{/if}

<style>
  :global(div.my-data-accordion > h2.accordion-header > button.accordion-button) {
    background-color: var(--bs-accordion-active-bg) !important;
  }
</style>
