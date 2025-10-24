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
  import PatientStory from '$lib/components/app/PatientStory.svelte';
  import PatientMedical from '$lib/components/app/PatientMedical.svelte';
  import PatientNeeds from '$lib/components/app/PatientNeeds.svelte';
  import PatientBody from '$lib/components/app/PatientBody.svelte';
  import ODHForm from '$lib/components/app/ODHForm.svelte';
  import type {
    ResourceRetrieveEvent,
    DataCategoryConfig,
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
  let activeTab: string | number = 'patient';
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
      setTimeout(() => document.querySelector(`span.patient-tab`)?.parentElement?.click(), 1); 
    }
  }

  let activeSection: string;
  $: activeSection = $page.url.hash.split('#')[1];

  onMount(async function() {
    if (sessionStorage.getItem('URL')) {
      let url = sessionStorage.getItem('URL') ?? '/data';
      let currentUrl = window.location.href.split('?')[0];
      sessionStorage.removeItem('URL');
      if (url !== currentUrl) {
        return goto(url);
      }
    }
    activeTab = sessionStorage.getItem('TAB') ?? activeTab;
    sessionStorage.removeItem('TAB');
    const accordion = document.querySelector('div.add-data > div.accordion-collapse');
    if (accordion) {
      accordion.style.overflow = 'visible';
      accordion.classList.add('at-load');
      setTimeout(() => {
        accordion.classList.remove('at-load');
      }, 250);
    }
    let tab = document.querySelector(`span.${activeTab}-tab`)?.parentElement
    tab?.click();

    const accordions = document.querySelectorAll('div.section-accordion');
    if (accordions) {
      for (const accordion of Array.from(accordions)) {
        const button = accordion?.querySelector('button.accordion-button');
        if (button) {
          button.addEventListener('click', () => {
            setTimeout(() => {
              button.scrollIntoView(true)
            }, 400);
          });
        }
      }
    }
    setTimeout(() => {
      const accordions = document.querySelectorAll('div.section-accordion');
      if (accordions) {
        for (const accordion of Array.from(accordions)) {
          const shownCollapse = accordion?.querySelector('div.accordion-collapse.show');
          if (shownCollapse) {
            const button = accordion?.querySelector('button.accordion-button');
            if (button) {
              button.scrollIntoView(true);
            }
            break;
          }
        }
      }
    }, 500);
  });
  
  async function preAuthRedirectHandler(details: SOFAuthEvent|undefined) {
    let url = $page.url.href.split('#')[0];
    const openAccordion = document.querySelector('div.section-accordion:has(div.accordion-collapse.show)');
    if (openAccordion) {
      let activeSection = sections.map(s => s.id).find(sid => openAccordion.classList.contains(sid));
      if (activeSection) {
        url += `#${activeSection}`;
      }
    }
    sessionStorage.setItem('URL', url);
    sessionStorage.setItem('TAB', String(activeTab ?? ""));
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
        await fhirDataService.addOrReplaceDataset(resourceResult.resources, resourceResult.category, resourceResult.source, resourceResult.sourceName);
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

  let sections: {id: string; title?: string; description?: string; categories: DataCategoryConfig[]}[] = [
    {
      id: "about-me",
      title: "About Me",
      description: "Manage information about you to be shown in your next Health Summary.",
      categories: [
        { category: "patient", component: Demographic, editable: true }
      ]
    },
    {
      id: "healthcare-providers",
      title: "Data from Healthcare Providers",
      description: "",
      categories: [
        {
          category: "sof-health-record",
          tabTitle: "SMART Data Access",
          description: "Fetch US Core data from your healthcare provider via SMART authorization.",
          component: FetchSoF
        },
        {
          category: "fetch-url",
          tabTitle: "FHIR URL",
          description: "Fetch health summary data from a FHIR URL.",
          advanced: true,
          component: FetchUrl
        }
      ]
    },
    {
      id: "my-story",
      title: "My Health in My Words",
      description: "Your own representation of your health, history, needs and goals.",
      categories: [
        {
          category: "patient-story",
          tabTitle: "My Story",
          description: "Create a description of your personal patient story and goals for care.",
          component: PatientStory,
          editable: true
        },
        {
          category: "patient-medical-history",
          tabTitle: "My Medical History",
          description: "Add any health conditions, medications, or history of illness that may not be included elsewhere in your health history.",
          component: PatientMedical,
          editable: true
        },
        {
          category: "patient-care-needs",
          tabTitle: "My Care Needs",
          description: "Select any identities, functional concerns, or needs you would like your carers to be aware of.",
          component: PatientNeeds,
          editable: true
        },
        {
          category: "patient-body-concerns",
          tabTitle: "My Body",
          description: "Record brief concerns about any specific part of your body.",
          component: PatientBody,
          editable: true
        }
      ]
    },
    {
      id: "advance-directives",
      title: "Advance Directives",
      description: "Create or retrieve your Advance Directive documents from a repository.",
      categories: [
        {
          category: "advance-directives",
          component: FetchAD,
          editable: true
        }
      ]
    },
    {
      id: "occupation",
      title: "Health-Related Work Info",
      description: "Manage information about the work you do to include in your Health Summary.",
      categories: [
        {
          category: "occupational-data-for-health",
          component: ODHForm,
          editable: true
        }
      ]
    }

  ]

</script>

<Accordion>
  {#each sections as section}
    <AccordionItem class="{section.id} section-accordion" active={section.id === activeSection}>
      <h5 slot="header" class="my-2">{section.title}</h5>
      <DataCategoryView
        title={section.title}
        description={section.description}
        categories={section.categories}
        showAdd={section.id === activeSection}
        on:sof-auth-init={ async ({ detail }) => { preAuthRedirectHandler(detail) } }
        on:sof-auth-fail={ async ({ detail }) => { revertPreAuth(detail) }}
        on:update-resources={ async ({ detail }) => { handleNewResources(detail) } }
      />
    </AccordionItem>
  {/each}
</Accordion>

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
  :global(div.section-accordion > h2.accordion-header) {
    position: sticky;
    top: 0;
    background-color: white;
    z-index: 100;
  }
</style>