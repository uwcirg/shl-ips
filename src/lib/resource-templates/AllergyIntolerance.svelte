<script lang="ts">
  import {
    Card,
    CardBody
  } from 'sveltestrap';
  export let resource:any; // Define a prop to pass the data to the component

  function badgeColor(criticality: string | undefined) {
    if (criticality) {
      if (criticality == "high") {
        return "badge-danger";
      } else {
        return "badge-primary";
      }
    } else {
      return "badge-secondary";
    }
  }
</script>

<Card>
  <CardBody>
    <span class={"badge " + badgeColor(resource.criticality ?? "")}>{resource.type ?? ""} - {resource.category && resource.category.length > 0 ? resource.criticality[0] : ""} - Criticality: {resource.criticality ?? ""}</span>
    {#if resource.code && resource.code.coding}
      <br>
      {resource.code.coding[0].display} ({resource.code.coding[0].code})
    {/if}
  </CardBody>
</Card>
