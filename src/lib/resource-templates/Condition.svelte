<script>
  import { Badge, Card, CardBody } from 'sveltestrap';
  export let resource; // Define a prop to pass the data to the component

  function badgeColor(severity) {
    if (severity) {
      if (severity == 'Severe') {
        return 'badge-danger';
      } else {
        return 'badge-primary';
      }
    } else {
      return 'badge-secondary';
    }
  }
</script>

<Card>
  <CardBody>
    <span class={'badge ' + badgeColor(resource.severity ?? '')}
      >Severity: {resource.severity ?? 'unknown'}</span
    >
    {#if resource.code && resource.code.coding && resource.code.coding[0]}
      <Badge color="primary">{resource.code.coding[0].system}</Badge>
      <br />
      {resource.code.coding[0].display} ({resource.code.coding[0].code})
    {:else if resource.code && resource.code.text}
      {resource.code.text}
    {/if}
    {resource.bodySite ? `Site: ${resource.bodySite}` : ''}
    {resource.onsetDateTime ? `Since ${resource.onsetDateTime}` : ''}
    {#if resource.clinicalStatus || resource.verificationStatus}
      <Badge color="primary">
        {resource.clinicalStatus?.coding[0].code ?? ''}
        {resource.clinicalStatus &&
          resource.verificationStatus
            ? ', '
            : ''}
        {resource.verificationStatus?.coding[0].code ?? ''}
      </Badge>
    {/if}
  </CardBody>
</Card>
