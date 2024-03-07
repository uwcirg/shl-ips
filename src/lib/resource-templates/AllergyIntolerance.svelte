<script lang="ts">
  import { Badge, Card, CardBody } from 'sveltestrap';
  export let resource: any; // Define a prop to pass the data to the component

  function badgeColor(criticality: string | undefined) {
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

<Card>
  <CardBody>
    <Badge color={badgeColor(resource.criticality ?? '')}>
      {resource.type ? `${resource.type} - ` : ''}
      {resource.category && resource.category.length > 0
          ? `${resource.criticality[0]} - `
          : ''} Criticality: {resource.criticality ?? 'unknown'}
    </Badge>
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
    {#if resource.code && resource.code.coding}
      <br />
      {resource.code?.coding[0].display ?? ''} ({resource.code?.coding[0].code})
    {/if}
    {#if resource.onsetDateTime}
      Since {resource.onsetDateTime}
    {/if}
  </CardBody>
</Card>
