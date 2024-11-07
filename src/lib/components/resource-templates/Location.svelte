<script lang="ts">
  import type { Location } from "fhir/r4";
  import Address from "./Address.svelte";
  import ContactPoint from "./ContactPoint.svelte";
  
  export let resource: Location; // Define a prop to pass the data to the component
</script>
  
<strong>{resource.name ?? ""}</strong>
<br />
<ContactPoint contactPoint={resource.telecom} />
<Address address={resource.address} />
  