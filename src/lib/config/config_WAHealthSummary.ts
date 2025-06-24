import AddFile from '$lib/components/app/AddFile.svelte';
import Introduction from '$lib/components/app/Introduction.svelte';

export default {
  title: "WA Health Summary",
  header: {
    logo: "/img/wa-health-summary.png",
    logo_width: "200",
    title: "HL7 Standards-Based Patient Summary",
  },
  defaultRedirectURI: "/summaries",
  home: {
    introComponent: Introduction
  },
  summaries: {
  },
  create: {
    component: AddFile
  }
};