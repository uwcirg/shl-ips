<script lang="ts">
  export let warning = "Demonstration/Test System - do not use with real health information";
</script>

{#if warning}
<span style="margin: 50px 0px;">
  <p class="text-danger info-paragraph">{warning}</p>
</span>
{/if}
<p class="info-paragraph">
  "WA Health Summary | POLST" lets people obtain and personally control the sharing of their POLST advanced care planning documents and other health information, with any health care provider, family member or other individuals of their choosing using a simple web link or QR code.
</p>
<p class="info-paragraph">
  This version of WA Health Summary is limited to the use of Portable Orders for Life Sustaining Treatment (POLST).  These forms let people with serious illnesses describe the treatments that match their values and preferences, to ensure they do not receive treatments they don’t want, and that they do receive treatments they value.
</p>