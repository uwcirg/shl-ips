import { CATEGORIES, METHODS} from '$lib/config/tags';

import AddSummary from '$lib/components/app/AddSummary.svelte';
import IntroductionMyHealthSummary from '$lib/components/app/IntroductionMyHealthSummary.svelte';
import PrivacyAndTrustMyHealthSummary from '$lib/components/app/PrivacyAndTrustMyHealthSummary.svelte';

import Demographic from '$lib/components/app/Demographic.svelte';
import FetchSoFSearch from '$lib/components/app/FetchSoFSearch.svelte';
import PatientStory from '$lib/components/app/PatientStory.svelte';
import PatientMedical from '$lib/components/app/PatientMedical.svelte';
import PatientNeeds from '$lib/components/app/PatientNeeds.svelte';
import PatientBody from '$lib/components/app/PatientBody.svelte';
import CreatePOLST from '$lib/components/app/CreatePOLST.svelte';
import ODHForm from '$lib/components/app/ODHForm.svelte';
import AboutMeTitle from '$lib/components/app/AboutMeTitle.svelte';

export default {
  title: "My Health Summary",
  imgPath: "/img/my-health-summary",
  header: {
    logo_width: "200",
    title: "HL7 Standards-Based Patient Summary",
  },
  defaultRedirectURI: "/data",
  advanced: false,
  pages: {
    home: {
      introComponent: IntroductionMyHealthSummary,
      privacyComponent: PrivacyAndTrustMyHealthSummary
    },
    data: {
      sections: [
        {
          id: "healthcare-providers",
          title: "Data from Healthcare Providers",
          description: "",
          category: CATEGORIES.PROVIDER_HEALTH_RECORD,
          forms: [
            {
              method: METHODS.PROVIDER_HEALTH_RECORD_SOF_SEARCH,
              tabTitle: "Provider Search",
              description: "Import your health data from your healthcare provider via SMART authorization.",
              component: FetchSoFSearch
            }
          ]
        },
        {
          id: "my-story",
          title: "My Health in My Words",
          description: "Your own representation of your health, history, needs and goals.",
          category: CATEGORIES.PATIENT_STORY,
          forms: [
            {
              method: METHODS.PATIENT_STORY_FORM,
              tabTitle: "My Story",
              description: "Describe your personal patient story and goals for care.",
              component: PatientStory,
              editable: true
            },
            {
              method: METHODS.PATIENT_MEDICAL_HISTORY_FORM,
              tabTitle: "My Medical History",
              description: "Add any health conditions, medications, or history of illness that may not be included elsewhere in your health history.",
              component: PatientMedical,
              editable: true
            },
            {
              method: METHODS.PATIENT_CARE_NEEDS_FORM,
              tabTitle: "My Care Needs",
              description: "Select identities, functional concerns, or needs you would like your carers to be aware of.",
              component: PatientNeeds,
              editable: true
            },
            {
              method: METHODS.PATIENT_BODY_CONCERNS_FORM,
              tabTitle: "My Body",
              description: "Record brief concerns about any specific part of your body.",
              component: PatientBody,
              editable: true
            }
          ]
        },
        {
          id: "advance-directives",
          title: "Add Care Planning Documents",
          description: "Create or retrieve care planning documents.",
          category: CATEGORIES.ADVANCE_DIRECTIVES,
          forms: [
            {
              method: METHODS.ADVANCE_DIRECTIVES_CREATE_POLST,
              tabTitle: "Create a POLST",
              description: "Create a new WA State POLST document.",
              component: CreatePOLST
            }
          ]
        },
        {
          id: "about-me",
          title: "About Me",
          description: "Add or update information about yourself.",
          info: "Some fields may already be filled with information from your account login. The information here can be added to your Shareable Health Summary, but this form will not change information that you download from healthcare providers or other sources.",
          forms: [
            {
              method: "patient",
              title: "Edit My Personal Information",
              description: "Edit the information about yourself that you would like to include in your Shareable Health Summaries.",
              component: Demographic,
              editable: true
            }
          ]
        },
        {
          id: "occupation",
          title: "Health-Related Work Info",
          description: "Manage information about the work you do to include in your Health Summary.",
          category: CATEGORIES.OCCUPATIONAL_DATA_FOR_HEALTH,
          forms: [
            {
              method: METHODS.OCCUPATIONAL_DATA_FOR_HEALTH_FORM,
              component: ODHForm,
              editable: true
            }
          ]
        }
      ]
    },
    manage: {},
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