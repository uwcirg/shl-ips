import AddSummary from '$lib/components/app/AddSummary.svelte';
import IntroductionMyHealthSummary from '$lib/components/app/IntroductionMyHealthSummary.svelte';

import Demographic from '$lib/components/app/Demographic.svelte'
import FetchSoFSearch from '$lib/components/app/FetchSoFSearch.svelte'
import PatientStory from '$lib/components/app/PatientStory.svelte'
import PatientMedical from '$lib/components/app/PatientMedical.svelte'
import PatientNeeds from '$lib/components/app/PatientNeeds.svelte'
import PatientBody from '$lib/components/app/PatientBody.svelte'
import CreatePOLST from '$lib/components/app/CreatePOLST.svelte'
import ODHForm from '$lib/components/app/ODHForm.svelte'

export default {
  title: "My Health Summary",
  imgPath: "/img/my-health-summary",
  header: {
    logo_width: "200",
    title: "HL7 Standards-Based Patient Summary",
  },
  defaultRedirectURI: "/data",
  pages: {
    home: {
      introComponent: IntroductionMyHealthSummary
    },
    data: {
      sections: [
        {
          id: "about-me",
          title: "About Me",
          description: "Add or update information about yourself. Some fields may already be filled with information from your account login.<br>The information here can be added to your Shareable Health Summary, but this form will not change information that you download from healthcare providers or other sources.",
          category: "patient",
          forms: [
            {
              method: "patient",
              component: Demographic,
              editable: true
            }
          ]
        },
        {
          id: "healthcare-providers",
          title: "Data from Healthcare Providers",
          description: "",
          category: "provider-health-record",
          forms: [
            {
              method: "provider-health-record-sof-search",
              tabTitle: "Provider Search",
              description: "Fetch US Core data from your healthcare provider via SMART authorization.",
              component: FetchSoFSearch
            }
          ]
        },
        {
          id: "my-story",
          title: "My Health in My Words",
          description: "Your own representation of your health, history, needs and goals.",
          category: "patient-story",
          forms: [
            {
              method: "patient-story-form",
              tabTitle: "My Story",
              description: "Create a description of your personal patient story and goals for care.",
              component: PatientStory,
              editable: true
            },
            {
              method: "patient-medical-history-form",
              tabTitle: "My Medical History",
              description: "Add any health conditions, medications, or history of illness that may not be included elsewhere in your health history.",
              component: PatientMedical,
              editable: true
            },
            {
              method: "patient-care-needs-form",
              tabTitle: "My Care Needs",
              description: "Select any identities, functional concerns, or needs you would like your carers to be aware of.",
              component: PatientNeeds,
              editable: true
            },
            {
              method: "patient-body-concerns-form",
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
          category: "advance-directives",
          forms: [
            {
              method: "advance-directives-create-polst",
              tabTitle: "Create POLST",
              component: CreatePOLST
            }
          ]
        },
        {
          id: "occupation",
          title: "Health-Related Work Info",
          description: "Manage information about the work you do to include in your Health Summary.",
          category: "occupational-data-for-health",
          forms: [
            {
              method: "occupational-data-for-health-form",
              component: ODHForm,
              editable: true
            }
          ]
        }
      ]
    },
    summaries: {},
    share: {
      component: AddSummary
    }
  },
  disallowedPages: [
    'documents',
    'patient',
    'provider'
  ]
};