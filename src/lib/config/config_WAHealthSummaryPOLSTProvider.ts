import IntroductionPOLSTProvider from '$lib/components/app/IntroductionPOLSTProvider.svelte';

let instanceTitle = "WA Health Summary | POLST Lookup for Providers";
export default {
  title: instanceTitle,
  imgPath: "/img/wa-health-summary-polst",
  header: {
    logo_width: "300",
    title: "Lookup for Providers",
    title_style: "vertical-align: middle;font-size: 24px;display: inline-block;font-family: Verdana, sans-serif;color: rgb(161, 78, 78);"
  },
  defaultRedirectURI: "/provider",
  advanced: false,
  pages: {
    home: {
      introComponent: IntroductionPOLSTProvider
    },
    provider: {
    }
  },
  disallowedPages: [
    'patient',
    'provider'
  ]
};