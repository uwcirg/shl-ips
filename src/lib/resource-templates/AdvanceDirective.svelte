<script>
  import { base64toBlob } from '$lib/util';
  export let resource; // Define a prop to pass the data to the component
</script>

<!--
Type: {resource.resourceType}
<br />
Text:
{#if resource.text && resource.text.div}
  {resource.text.div}
{:else}
  <i>No text provided in resource</i>
{/if}
<br />
-->

<b>Category:</b>
{#if resource.category && resource.category[0] && resource.category[0].coding && resource.category[0].coding[0]}
  {resource.category[0].coding[0].display} (LOINC {resource.category[0].coding[0].code})
{/if}
<br />
<b>Type:</b>
<!-- 42348-3 is for "Advance Directive"; per cthon, it's presence here is redundant w/ category above. -->
{#if resource.type && resource.type.coding && resource.type.coding[0] && resource.type.coding[0].code != '42348-3'}
  {resource.type.coding[0].display} (LOINC {resource.type.coding[0].code})
{/if}
{#if resource.type && resource.type.coding && resource.type.coding[1] && resource.type.coding[1].code != '42348-3'}
  {resource.type.coding[1].display} (LOINC {resource.type.coding[1].code}).
{/if}
<br />
<b>Description:</b>
{#if resource.description}
  {resource.description}
{/if}
<br />
<b>Author:</b>
{#if resource.author && resource.author[0] && resource.author[0].display}
  {resource.author[0].display}
{/if}
<br />
<b>setId:</b>
{#if resource.identifier && resource.identifier[0] && resource.identifier[0].system && resource.identifier[0].system == 'https://mydirectives.com/standards/terminology/namingSystem/setId'}
  {resource.identifier[0].value}
{/if}
<br />
<b>Version number:</b>
{#if resource.extension && resource.extension[0] && resource.extension[0].url && resource.extension[0].url == 'http://hl7.org/fhir/us/ccda/StructureDefinition/VersionNumber'}
  <!-- As of the July '24 this is now a unix time stamp --> 
  {resource.extension[0].valueInteger}
{/if}
<br />
<!-- This is the date that the DocumentReference resource was created, not of interest.
<b>Date:</b>
{#if resource.date}
  {resource.date}
{/if}
<br />
-->
<b>Status:</b>
{#if resource.status}
  {resource.status}
{/if}
<br />

<!-- Revoke Status -->
{#if resource.extension}
  {#each resource.extension as ext}
    {#if ext.url == 'http://hl7.org/fhir/us/pacio-adi/StructureDefinition/adi-document-revoke-status-extension'}
      <b>Revoke Status:</b> {ext.valueCoding.code}
      <br />
    {/if}
  {/each}
{/if}

<b>docStatus:</b>
{#if resource.docStatus}
  {resource.docStatus}
{/if}
{#if resource.description && resource.description.text}
  <br />
  {resource.description.text}
{/if}
<br/>

{#if resource.isPolst}
<br/>
  <b>
  POLST Details:
<br/>
<br/>
    <ul>
      {#if resource.isCpr}
        <ol>
{#if resource.doNotPerformCpr}
  This includes a directive to NOT perform CPR.
{:else}
  This includes a directive to perform CPR.
{/if}
        </ol>
{/if}
<br/>

{#if resource.isComfortTreatments}
        <ol>
{#if resource.doNotPerformComfortTreatments}
  This includes a directive to NOT perform comfort-focused treatments: {@html resource.detailComfortTreatments}
{:else}
  This includes a directive to perform comfort-focused treatments: {@html resource.detailComfortTreatments}
{/if}
        </ol>
{/if}
<br/>

{#if resource.isAdditionalTx}
        <ol>
{#if resource.doNotPerformAdditionalTx}
  This includes a directive to NOT perform additional treatments: {@html resource.detailAdditionalTx}
{:else}
  This includes a directive to perform additional treatments: {@html resource.detailAdditionalTx}
{/if}
        </ol>
{/if}
<br/>

{#if resource.isMedicallyAssisted}
        <ol>
{#if resource.doNotPerformMedicallyAssisted}
  This includes a directive to NOT perform medically assisted nutrition: {@html resource.detailMedicallyAssisted}
{:else}
  This includes a directive to perform medically assisted nutrition: {@html resource.detailMedicallyAssisted}
{/if}
        </ol>
{/if}
</ul>
</b>
<br/>
{/if}

{#if resource.content}
<!-- FIXME This iteration not ideal - should iterate whether pdf present or not, as created & pdfSignedDate (ill-named) actually refer to the larget context of the DR, not the pdf... as it stands the Personal Advance Care Plan Document won't show created/signed (bug), tho we don't care so much about that one in IPS. 
-->
  {#each resource.content as content}
    {#if content.attachment && content.attachment.contentType === "application/pdf" && content.attachment.data}
      {#await base64toBlob(content.attachment.data, content.attachment.contentType) then url}
        {#if content.attachment && content.attachment.creation}
          <b>Created:</b> {new Date(content.attachment.creation).toISOString().slice(0,10)}
					<br/>
        {/if}
        {#if resource.pdfSignedDate}
          <!--
          <b>Digitally signed:</b> {new Date(resource.pdfSignedDate).toISOString().slice(0,10)}
          <br/>
          -->
        {/if}
        <b>PDF present:</b> 
      <a href={url} target="_blank" rel="noopener noreferrer">View</a>
      {/await}
    {/if}
  {/each}
{/if}
