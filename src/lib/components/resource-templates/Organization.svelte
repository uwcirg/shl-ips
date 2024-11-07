<script lang="ts">
  import type { Organization } from "fhir/r4";
  import Address from "./Address.svelte";
  
  export let resource: Organization; // Define a prop to pass the data to the component
</script>

<strong>{resource.name}</strong>
<br />
<Address address={resource.address} />
