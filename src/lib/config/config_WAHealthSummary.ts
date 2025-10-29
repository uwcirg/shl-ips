import AddSummary from '$lib/components/app/AddSummary.svelte';
import Introduction from '$lib/components/app/Introduction.svelte';

export default {
  title: "WA Health Summary",
  header: {
    logo: "/img/wa-health-summary.png",
    logo_width: "200",
    title: "HL7 Standards-Based Patient Summary",
  },
  defaultRedirectURI: "/data",
  pages: {
    home: {
      introComponent: Introduction
    },
    data: {},
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