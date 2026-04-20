import { CATEGORIES, METHODS} from '$lib/config/tags';

import AddSummary from '$lib/components/app/AddSummary.svelte';
import Introduction from '$lib/components/app/Introduction.svelte';
import LogoRowWAHealthSummary from '$lib/components/app/LogoRowWAHealthSummary.svelte';
import PrivacyAndTrust from '$lib/components/app/PrivacyAndTrust.svelte';

import Demographic from '$lib/components/app/Demographic.svelte';
import FetchSoF from '$lib/components/app/FetchSoF.svelte';
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
import AboutMeTitle from '$lib/components/app/AboutMeTitle.svelte';

export default {
  title: "WA Health Summary",
  imgPath: "/img/wa-health-summary",
  header: {
    logo: "logo-60h.png",
    logo_width: "200",
    title: "HL7 Standards-Based Patient Summary",
  },
  defaultRedirectURI: "/data",
  advanced: true,
  pages: {
    home: {
      introComponent: Introduction,
      logoComponent: LogoRowWAHealthSummary,
      privacyComponent: PrivacyAndTrust
      
    },
    data: {
      sections: [
        {
          id: "healthcare-providers",
          title: "Import from Healthcare Providers",
          description: "",
          category: CATEGORIES.PROVIDER_HEALTH_RECORD,
          forms: [
            {
              method: METHODS.PROVIDER_HEALTH_RECORD_SOF,
              tabTitle: "Find Your Healthcare Provider",
              description: "Import sample health data from the following test servers.",
              formDescription: "Import sample health data from the following test servers.",
              component: FetchSoF
            },
            {
              method: METHODS.PROVIDER_HEALTH_RECORD_CARINBB,
              tabTitle: "Find Your Insurance Provider",
              description: "Import sample insurance and health data from the following test servers.",
              formDescription: "Import sample health data from the following test servers.",
              advanced: true,
              component: FetchCARINBB
            },
            {
              method: METHODS.PROVIDER_HEALTH_RECORD_URL,
              tabTitle: "FHIR URL",
              description: "Import health data from a FHIR URL.",
              advanced: true,
              component: FetchUrl
            },
            {
              method: METHODS.PROVIDER_HEALTH_RECORD_TEFCA,
              tabTitle: "TEFCA Query",
              description: "Import health data using a federated TEFCA query.",
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
          title: "Personal Health Notes",
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
              method: METHODS.ADVANCE_DIRECTIVES_SEARCH,
              tabTitle: "Document Search",
              description: "Retrieve your care planning documents from a document repository.",
              component: FetchAD
            },
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
          category: CATEGORIES.ABOUT_ME,
          forms: [
            {
              method: "patient",
              tabTitle: "About Me",
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
              tabTitle: "Edit My Work Information",
              description: "Add your employment history, retirement status, and combat zone exposure.",
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
}