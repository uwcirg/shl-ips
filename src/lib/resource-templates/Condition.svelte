<script>
  import { Badge, Card, CardBody } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component

  function badgeColor(severity) {
    if (severity) {
      if (severity == 'Severe') {
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
<Badge color={badgeColor(resource.severity ?? '')}>severity: {resource.severity ?? 'unknown'}</Badge>
{#if resource.code && resource.code.coding && resource.code.coding[0]}
  <Badge color="primary">{resource.code.coding[0].system} : {resource.code.coding[0].code}</Badge>
  <br />
  <strong>{resource.code.coding[0].display}</strong>
{:else if resource.code && resource.code.text}
  <strong>{resource.code.text}</strong>
{/if}
{resource.bodySite ? `Site: ${resource.bodySite}` : ''}
<br>
{resource.onsetDateTime ? `Since ${resource.onsetDateTime.split("T")[0]}` : ''}
