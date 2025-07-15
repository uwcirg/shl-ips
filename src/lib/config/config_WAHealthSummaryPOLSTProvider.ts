let instanceTitle = "WA Health Summary | POLST Lookup for Providers";
export default {
  title: instanceTitle,
  header: {
    logo: "/img/wa-health-summary-polst.png",
    logo_width: "300",
    title: "Lookup for Providers",
    title_style: "vertical-align: middle;font-size: 24px;display: inline-block;padding-left: 17px;font-family: Verdana, sans-serif;color: rgb(161, 78, 78);"
  },
  defaultRedirectURI: "/provider",
  pages: {
    home: {
      title: instanceTitle,
      intro: '<p class="info-paragraph">WA Health Summary lets people obtain and personally control the sharing of their health information, with any health care provider, family member or other individuals of their choosing, using a simple web link or QR code.</p><p class="info-paragraph">POLST forms let people with serious illnesses describe the treatments that match their values and preferences, to ensure they do not receive treatments they don’t want, and that they do receive treatments they value.</p>'
    },
    provider: {
      title: `Patients - ${instanceTitle}`
    }
  }
};