import AddFile from '$lib/components/app/AddFile.svelte';

export default {
  title: "WA Health Summary",
  header: {
    logo: "/img/wa-health-summary.png",
    logo_width: "200",
    title: "HL7 Standards-Based Patient Summary",
  },
  home: {
    intro: '<p class="info-paragraph">WA Health Summary lets people obtain and personally control the sharing of their health information, with any health care provider, family member or other individuals of their choosing, using a simple web link or QR code.</p>'
  },
  summaries: {
  },
  create: {
    component: AddFile,
  }
};