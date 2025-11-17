import AddFilePOLST from '$lib/components/app/AddFilePOLST.svelte';
import NavButtonCreate from '$lib/components/layout/NavButtonCreate.svelte';
import NavButtonSummaries from '$lib/components/layout/NavButtonSummaries.svelte';
import IntroductionPOLST from '$lib/components/app/IntroductionPOLST.svelte';

let instanceTitle = "WA Health Summary | POLST";
export default {
  title: instanceTitle,
  imgPath: "/img/wa-health-summary-polst",
  header: {
    logo_width: "300",
    title: "Provider Orders for Life-Sustaining Treatment",
  },
  defaultRedirectURI: "/summaries",
  advanced: false,
  pages: {
    home: {
      introComponent: IntroductionPOLST
    },
    summaries: {
      navButtonComponent: NavButtonSummaries
    },
    share: {
      navButtonComponent: NavButtonCreate,
      component: AddFilePOLST,
    },
    documents: {
    }
  },
  disallowedPages: [
    'api',
    'patient',
    'provider'
  ]
};