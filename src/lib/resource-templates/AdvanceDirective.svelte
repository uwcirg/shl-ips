<script>
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

Category:
{#if resource.category && resource.category[0] && resource.category[0].coding && resource.category[0].coding[0]}
  {resource.category[0].coding[0].display} (LOINC {resource.category[0].coding[0].code})
{/if}
<br />
Type:
<!-- 42348-3 is for "Advance Directive"; per cthon, it's presence here is redundant w/ category above. -->
{#if resource.type && resource.type.coding && resource.type.coding[0] && resource.type.coding[0].code != '42348-3'}
  {resource.type.coding[0].display} (LOINC {resource.type.coding[0].code})
{/if}
{#if resource.type && resource.type.coding && resource.type.coding[1] && resource.type.coding[1].code != '42348-3'}
  {resource.type.coding[1].display} (LOINC {resource.type.coding[1].code}).
{/if}
<br />
Description:
{#if resource.description}
  {resource.description}
{/if}
<br />
Date:
{#if resource.date}
  {resource.date}
{/if}
<br />
Status:
{#if resource.status}
  {resource.status}
{/if}
<br />
docStatus:
{#if resource.docStatus}
  {resource.docStatus}
{/if}
<br />
{#if resource.description && resource.description.text}
  {resource.description.text}
{/if}
