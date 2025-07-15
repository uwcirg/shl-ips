import AddFilePOLST from '$lib/components/app/AddFilePOLST.svelte';
import NavButtonCreate from '$lib/components/layout/NavButtonCreate.svelte';
import NavButtonSummaries from '$lib/components/layout/NavButtonSummaries.svelte';
import IntroductionPOLST from '$lib/components/app/IntroductionPOLST.svelte';

let instanceTitle = "WA Health Summary | POLST";
export default {
  title: instanceTitle,
  header: {
    logo: "/img/wa-health-summary-polst.png",
    logo_width: "300",
    title: "Provider Orders for Life-Sustaining Treatment",
  },
  defaultRedirectURI: "/summaries",
  pages: {
    home: {
      introComponent: IntroductionPOLST
    },
    summaries: {
      navButtonComponent: NavButtonSummaries
    },
    create: {
      navButtonComponent: NavButtonCreate,
      component: AddFilePOLST,
    },
    documents: {
    }
  }
};