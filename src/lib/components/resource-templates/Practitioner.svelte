<script lang="ts">
    import type { Practitioner } from "fhir/r4";
    import HumanName from "./HumanName.svelte";
    import Address from "./Address.svelte";

    export let resource: Practitioner; // Define a prop to pass the data to the component
</script>
  
<HumanName name={resource.name} />
{#if resource.gender}
    Gender: {resource.gender ?? ""}<br>
{/if}
<Address address={resource.address} />
  