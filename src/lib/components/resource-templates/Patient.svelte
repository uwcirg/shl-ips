<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { Patient } from "fhir/r4";
  import HumanName from './HumanName.svelte';
  import Address from './Address.svelte';
    import ContactPoint from './ContactPoint.svelte';
  
  export let resource: Patient; // Define a prop to pass the data to the component
</script>

<HumanName name={resource.name} />
{#if resource.birthDate}
    Birth Date: {resource.birthDate}<br>
{/if}
{#if resource.gender}
    Gender: {resource.gender ?? ""}<br>
{/if}
<ContactPoint contactPoint={resource.telecom} />
<Address address={resource.address} />

{#if resource.contact}
  {#each resource.contact as contact}
    <strong>Emergency Contact:</strong><br>
    {#if contact.relationship}
        {#each contact.relationship as relationship}
            {#if relationship.coding && relationship.coding[0].display}
                <Badge color="secondary">{relationship.coding[0].display}</Badge>
            {/if}
        {/each}
        <br>
    {/if}
    <HumanName name={contact.name} />
    {#if contact.gender}
      Gender: {contact.gender ?? ""}<br>
    {/if}
    <ContactPoint contactPoint={contact.telecom} />
    <Address address={contact.address} />
  {/each}
{/if}
