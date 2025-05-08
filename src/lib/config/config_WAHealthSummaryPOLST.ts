import AddFilePOLST from '$lib/components/app/AddFilePOLST.svelte';

export default {
  title: 'WA Health Summary | POLST',
  header: {
    logo: "/img/wa-health-summary-polst.png",
    logo_width: "300",
    title: "Provider Orders for Life-Sustaining Treatment",
  },
  home: {
    intro: '<p class="info-paragraph">WA Health Summary lets people obtain and personally control the sharing of their health information, with any health care provider, family member or other individuals of their choosing, using a simple web link or QR code.</p><p class="info-paragraph">POLST forms let people with serious illnesses describe the treatments that match their values and preferences, to ensure they do not receive treatments they don’t want, and that they do receive treatments they value.</p>'
  },
  summaries: {
  },
  create: {
    component: AddFilePOLST,
  }
};