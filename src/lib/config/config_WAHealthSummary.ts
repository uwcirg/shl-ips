import { CATEGORIES, METHODS} from '$lib/config/tags';

import AddSummary from '$lib/components/app/AddSummary.svelte';
import Introduction from '$lib/components/app/Introduction.svelte';
import PrivacyAndTrust from '$lib/components/app/PrivacyAndTrust.svelte';

import Demographic from '$lib/components/app/Demographic.svelte';
import FetchSoF from '$lib/components/app/FetchSoF.svelte';
import FetchSoFSearch from '$lib/components/app/FetchSoFSearch.svelte';
import FetchUrl from '$lib/components/app/FetchUrl.svelte';
import FetchFile from '$lib/components/app/FetchFile.svelte';
import FetchCARINBB from '$lib/components/app/FetchCARINBB.svelte';
import FetchTEFCA from '$lib/components/app/FetchTEFCA.svelte';
import PatientStory from '$lib/components/app/PatientStory.svelte';
import PatientMedical from '$lib/components/app/PatientMedical.svelte';
import PatientNeeds from '$lib/components/app/PatientNeeds.svelte';
import PatientBody from '$lib/components/app/PatientBody.svelte';
import FetchAD from '$lib/components/app/FetchAD.svelte';
import CreatePOLST from '$lib/components/app/CreatePOLST.svelte';
import ODHForm from '$lib/components/app/ODHForm.svelte';

export default {
  title: "WA Health Summary",
  imgPath: "/img/wa-health-summary",
  header: {
    logo_width: "200",
    title: "HL7 Standards-Based Patient Summary",
  },
  defaultRedirectURI: "/data",
  advanced: true,
  pages: {
    home: {
      introComponent: Introduction,
      privacyComponent: PrivacyAndTrust
      
    },
    data: {
      sections: [
        {
          id: "about-me",
          title: "About Me",
          description: "Add or update information about yourself. Some fields may already be filled with information from your account login.<br>The information here can be added to your Shareable Health Summary, but this form will not change information that you download from healthcare providers or other sources.",
          forms: [
            { method: "patient", component: Demographic, editable: true }
          ]
        },
        {
          id: "healthcare-providers",
          title: "Data from Healthcare Providers",
          description: "",
          category: CATEGORIES.PROVIDER_HEALTH_RECORD,
          forms: [
            {
              method: METHODS.PROVIDER_HEALTH_RECORD_SOF,
              tabTitle: "SMART Data Access",
              description: "Fetch US Core data from a healthcare provider test server via SMART authorization.",
              component: FetchSoF
            },
            {
              method: METHODS.PROVIDER_HEALTH_RECORD_URL,
              tabTitle: "FHIR URL",
              description: "Fetch health summary data from a FHIR URL.",
              advanced: true,
              component: FetchUrl
            },
            {
              method: METHODS.PROVIDER_HEALTH_RECORD_CARINBB,
              tabTitle: "CARIN BB",
              description: "Fetch CARIN insurance data from an insurance provider test server via SMART authorization.",
              advanced: true,
              component: FetchCARINBB
            },
            {
              method: METHODS.PROVIDER_HEALTH_RECORD_TEFCA,
              tabTitle: "TEFCA Query",
              description: "Fetch health summary data with a federated TEFCA query.",
              advanced: true,
              component: FetchTEFCA
            },
            {
              method: METHODS.PROVIDER_HEALTH_RECORD_FILE,
              tabTitle: "File Upload",
              description: "Upload resources from an IPS or SMART Health Card file.",
              advanced: true,
              component: FetchFile,
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
              description: "Create a description of your personal patient story and goals for care.",
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
              description: "Select any identities, functional concerns, or needs you would like your carers to be aware of.",
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
          title: "Advance Directives",
          description: "Create or retrieve your Advance Directive documents from a repository.",
          category: CATEGORIES.ADVANCE_DIRECTIVES,
          forms: [
            {
              method: METHODS.ADVANCE_DIRECTIVES_SEARCH,
              tabTitle: "Directive Search",
              component: FetchAD
            },
            {
              method: METHODS.ADVANCE_DIRECTIVES_CREATE_POLST,
              tabTitle: "Create POLST",
              component: CreatePOLST
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
}