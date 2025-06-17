import AddFilePOLST from '$lib/components/app/AddFilePOLST.svelte';
import NavButtonCreate from '$lib/components/layout/NavButtonCreate.svelte';
import NavButtonSummaries from '$lib/components/layout/NavButtonSummaries.svelte';

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
      title: instanceTitle,
      intro: '<p class="info-paragraph">WA Health Summary lets people obtain and personally control the sharing of their health information, with any health care provider, family member or other individuals of their choosing, using a simple web link or QR code.</p><p class="info-paragraph">POLST forms let people with serious illnesses describe the treatments that match their values and preferences, to ensure they do not receive treatments they don’t want, and that they do receive treatments they value.</p>'
    },
    summaries: {
      title: `My Summaries - ${instanceTitle}`,
      navButtonComponent: NavButtonSummaries
    },
    create: {
      title: `Create a Health Link - ${instanceTitle}`,
      navButtonComponent: NavButtonCreate,
      component: AddFilePOLST,
    },
    documents: {
      title: `My Documents - ${instanceTitle}`
    }
  }
};