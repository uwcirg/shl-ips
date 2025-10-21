<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getContext } from 'svelte';
  import { type Writable } from 'svelte/store';
  import {
    Accordion,
    AccordionItem,
    Button,
    Card,
    CardBody,
    CardHeader,
    Col,
    Collapse,
    Dropdown,
    DropdownMenu,
    DropdownItem,
    DropdownToggle,
    FormGroup,
    Icon,
    Input,
    Label,
    NavItem,
    NavLink,
    Nav,
    Row,
    Spinner,
    TabContent,
    TabPane
  } from 'sveltestrap';
  import Demographic from '$lib/components/app/Demographic.svelte';
  import FetchUrl from '$lib/components/app/FetchUrl.svelte';
  import FetchSoF from '$lib/components/app/FetchSoF.svelte';
  import FetchAD from '$lib/components/app/FetchAD.svelte';
  import PatientStory from './PatientStory.svelte';
  import PatientMedical from './PatientMedical.svelte';
  import PatientNeeds from './PatientNeeds.svelte';
  import PatientBody from './PatientBody.svelte';
  import ODHForm from '$lib/components/app/ODHForm.svelte';
  import type {
    ResourceRetrieveEvent,
    DatasetSubmitEvent,
    SOFAuthEvent
  } from '$lib/utils/types';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import DataCategoryView from '$lib/components/app/DataCategoryView.svelte';
 
  export let status = "";

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let masterPatient;
  $: masterPatient = fhirDataService.masterPatient;
  let userResources;
  $: userResources = fhirDataService.userResources;

  const datasetDispatch = createEventDispatcher<{ 'dataset-submitted': DatasetSubmitEvent }>();
  let submitting = false;
  let fetchError = "";
  let currentTab: string | number = 'default';
  let successMessage = false;
  
  let mode: Writable<string> = getContext('mode');

  let resourceResult: ResourceRetrieveEvent = {
    resources: undefined
  }

  let resourcesAdded = false;
  $: {
    if ($userResources) {
      resourcesAdded = Object.keys($userResources).length > 0;
    }
  }

  $: {
    if ($mode === 'normal') {
      setTimeout(() => document.querySelector(`span.default-tab`)?.parentElement?.click(), 1); 
    }
  }

  onMount(async function() {
    if (sessionStorage.getItem('URL')) {
      let url = sessionStorage.getItem('URL') ?? '/data';
      let currentUrl = window.location.href.split('?')[0];
      sessionStorage.removeItem('URL');
      if (url !== currentUrl) {
        return goto(url);
      }
    }
    currentTab = sessionStorage.getItem('TAB') ?? currentTab;
    sessionStorage.removeItem('TAB');
    const accordion = document.querySelector('div.add-data > div.accordion-collapse');
    if (accordion) {
      accordion.style.overflow = 'visible';
      accordion.classList.add('at-load');
      setTimeout(() => {
        accordion.classList.remove('at-load');
      }, 250);
    }
    let tab = document.querySelector(`span.${currentTab}-tab`)?.parentElement
    tab?.click();
  });
  
  async function preAuthRedirectHandler(details: SOFAuthEvent|undefined) {
    sessionStorage.setItem('URL', window.location.href);
    sessionStorage.setItem('TAB', String(currentTab ?? ""));
  }

  async function revertPreAuth(details: SOFAuthEvent|undefined) {
    sessionStorage.removeItem('URL');
    sessionStorage.removeItem('TAB');
  }
  
  async function handleNewResources(details: ResourceRetrieveEvent) {
    try {
      resourceResult = details;
      if (resourceResult.resources) {
        // Trigger update in ResourceSelector
        await fhirDataService.addOrReplaceDataset(resourceResult.resources, resourceResult.category, resourceResult.source);
        showSuccessMessage();
      }
    } catch (e) {
      console.log('Failed', e);
      fetchError = "Error preparing IPS";
    }
  }

  async function showSuccessMessage() {
    successMessage = true;
    setTimeout(() => {
      successMessage = false;
    }, 1000);
  }

  function updateStatus(newStatus: string) {
    status = newStatus;
  }

  function showError(message: string) {
    fetchError = message;
  }

  function confirmContent() {
    submitting = true;
  }
  
  let tabNavOpen = false;
  let activeTab = 'patient';
  function toggleTab (tab: string) {
    if (activeTab !== tab) {
      activeTab = tab
    }
    tabNavOpen = false;
  }

  let tabs: Record<string, string> = {
    'patient': 'About Me', // Handled differently from other tabs
    'sof-health-record': 'Data from Healthcare Providers',
    'patient-story': 'My Story',
    'advance-directives': 'Advance Directives',
    'occupational-data-for-health': 'Health-Related Work Info',
    'patient-medical-history': 'My Medical History',
    'patient-care-needs': 'My Care Needs',
    'patient-body-concerns': 'My Body',
    'url': '*FHIR URL Upload'
  }
  let advancedTabs = ['url'];
</script>

<div class="d-flex flex-column flex-lg-row tab-content data-tabs">
  <!-- Sidebar for medium and up -->
  <Nav pills vertical class="flex-column d-none d-lg-flex me-3 p-2 bg-light rounded">
    <h6 class="py-2">Categories</h6>
    {#each Object.entries(tabs) as [tabId, tabName]}
      {#if !advancedTabs.includes(tabId) || $mode === 'advanced'}
      <NavItem>
        <NavLink active={activeTab === tabId} on:click={() => toggleTab(tabId)}>
          <span class="{tabId}-tab">{tabName}</span>
        </NavLink>
      </NavItem>
      {/if}
    {/each}
  </Nav>

  <!-- Mobile navigation toggle -->
  <div class="d-lg-none mb-3">
    <Nav tabs>
      <NavItem>
        <Dropdown nav isOpen={tabNavOpen}>
          <DropdownToggle nav caret class="active">Categories <Icon name="chevron-right" style="font-size: .7em"/> {tabs[activeTab]}</DropdownToggle>
          <DropdownMenu>
            {#each Object.entries(tabs) as [tabId, tabName]}
              {#if !advancedTabs.includes(tabId) || $mode === 'advanced'}
              <DropdownItem active={activeTab === tabId} on:click={() => toggleTab(tabId)}>
                  <span class="{tabId}-tab">{tabName}</span>
              </DropdownItem>
              {/if}
            {/each}
          </DropdownMenu>
        </Dropdown>
      </NavItem>
    </Nav>
  </div>

  <div class="tab-pane patient-tab {activeTab === 'patient' ? "active show": ""}">
    <DataCategoryView
      title="About Me"
      description="Add or update personal information to be shown in your next Health Summary."
      category="patient"
      editable
    >
      <Demographic slot="form" />
    </DataCategoryView>
  </div>
  <div class="tab-pane sof-health-record-tab {activeTab === 'sof-health-record' ? "active show": ""}">
    <DataCategoryView
      title="Data from Healthcare Providers"
      description="Fetch US Core data from your sof-health-record via SMART authorization."
      category="sof-health-record"
    >
      <FetchSoF slot="form"
        on:sof-auth-init={ async ({ detail }) => { preAuthRedirectHandler(detail) } }
        on:sof-auth-fail={ async ({ detail }) => { revertPreAuth(detail) }}
        on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
      />
    </DataCategoryView>
  </div>
  <div class="tab-pane patient-story-tab {activeTab === 'patient-story' ? "active show": ""}">
    <DataCategoryView
      title="My Story"
      description="Add or update your personal patient story and health goals."
      category="patient-story"
      editable
    >
      <PatientStory slot="form" />
    </DataCategoryView>
  </div>
  <div class="tab-pane advance-directives-tab {activeTab === 'advance-directives' ? "active show": ""}">
    <DataCategoryView
      title="Advance Directives"
      description="Create or retrieve your Advance Directive documents from a repository."
      category="advance-directives"
    >
      <FetchAD slot="form"
        on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
      />
    </DataCategoryView>
  </div>
  <div class="tab-pane occupational-data-for-health-tab {activeTab === 'occupational-data-for-health' ? "active show": ""}">
    <DataCategoryView
      title="Health-Related Work Info"
      description="Add or update information about the work you do to include in your Health Summary."
      category="occupational-data-for-health"
      editable
    >
      <ODHForm slot="form"
        on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
      />
    </DataCategoryView>
  </div>
  <div class="tab-pane patient-medical-history-tab {activeTab === 'patient-medical-history' ? "active show": ""}">
    <DataCategoryView
      title="My Medical History"
      description="Add any health conditions, medications, or history of illness that may not be included elsewhere in your health history."
      category="patient-medical-history-history"
      editable
    >
      <PatientMedical slot="form"
        on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
      />
    </DataCategoryView>
  </div>
  <div class="tab-pane patient-care-needs-tab {activeTab === 'patient-care-needs' ? "active show": ""}">
    <DataCategoryView
      title="My Care Needs"
      description="Select any identities, functional concerns, or needs you would like your carers to be aware of."
      category="patient-care-needs"
      editable
    >
      <PatientNeeds slot="form"
        on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
      />
    </DataCategoryView>
  </div>
  <div class="tab-pane patient-body-concerns {activeTab === 'patient-body-concerns' ? "active show": ""}">
    <DataCategoryView
      title="My Body"
      description="Record brief concerns about any specific part of your body."
      category="patient-body-concerns"
      editable
    >
      <PatientBody slot="form"
        on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
      />
    </DataCategoryView>
  </div>
  {#if $mode === 'advanced'}
  <div class="tab-pane url-tab {activeTab === 'url' ? "active show": ""}">
    <DataCategoryView
      title="FHIR URL Upload"
      description="Upload data from a FHIR server."
      category="fhir-url"
    >
      <FetchUrl slot="form"
        on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }  
      />
    </DataCategoryView>
  </div>
  {/if}
</div>

{#if $mode === "advanced"}
  <br>
  <em class="text-secondary">* Advanced features for demo purposes only</em>
  <br>
{/if}

<style>
  :global(.at-load) {
    transition: all 0s !important;
  }
  :global(.tab-content>.nav) {
    min-width: fit-content;
  }
  :global(.tab-content>.tab-pane) {
    width: 100%;
  }
</style>