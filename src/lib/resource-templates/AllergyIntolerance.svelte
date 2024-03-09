<script>
  import { Badge } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component

  function badgeColor(criticality) {
    if (criticality) {
      if (criticality == 'high') {
        return 'danger';
      } else {
        return 'primary';
      }
    } else {
      return 'secondary';
    }
  }
</script>

{#if resource.clinicalStatus || resource.verificationStatus}
  <Badge color="primary">
    {resource.clinicalStatus?.coding[0].code ?? ''}
    {resource.clinicalStatus &&
      resource.verificationStatus
        ? '/'
        : ''}
    {resource.verificationStatus?.coding[0].code ?? ''}
  </Badge>
{/if}
<Badge color={badgeColor(resource.criticality ?? '')}>
  {resource.type ? `${resource.type} - ` : ''}
  criticality: {resource.criticality ?? 'unknown'}
</Badge>
{#if resource.code}
  {#if resource.code.coding}  
    <Badge color="primary">{resource.code.coding[0].system} : {resource.code?.coding[0].code}</Badge>
    <br>
    <strong>
      {#if resource.code.coding[0].display}
        {resource.code.coding[0].display}
      {:else}
        {resource.code.text ?? ""}
      {/if}
    </strong>
    <br>
  {:else if resource.code.text}
    <strong>{resource.code.text}</strong>
    <br>
  {/if}
{/if}
{resource.onsetDateTime ? `Since ${resource.onsetDateTime.split("T")[0]}` : ''}
