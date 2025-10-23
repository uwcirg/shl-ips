<script lang="ts">
    import { Badge, Button, Icon } from 'sveltestrap';
    import { onMount } from 'svelte';
    import CodeableConceptTemplate from '$lib/components/resource-templates/CodeableConcept.svelte';
    import type { CodeableConcept, Patient } from "fhir/r4";
    import type { ResourceTemplateParams } from '$lib/utils/types';

    export let content: ResourceTemplateParams<Patient>; // Define a prop to pass the data to the component
    let resource: Patient;
    $: if (content) resource = content.resource;

    let showContact = false;

    let genderIdentityCodeableConcept: CodeableConcept | undefined;
    let pronounsCodeableConcept: CodeableConcept | undefined;
    let sexCharacteristicsCodeableConcept: CodeableConcept | undefined;
    let religionCodeableConcept: CodeableConcept | undefined;
    let culturalBackground: string | undefined;
    let communityAffiliation: string | undefined;

    onMount(() => {
        genderIdentityCodeableConcept = resource.extension?.find(
            e => e.url === 'http://hl7.org/fhir/StructureDefinition/individual-genderIdentity'
        )?.valueCodeableConcept;

        pronounsCodeableConcept = resource.extension?.find(
            e => e.url === 'http://hl7.org/fhir/StructureDefinition/individual-pronouns'
        )?.valueCodeableConcept;

        sexCharacteristicsCodeableConcept = resource.extension?.find(
            e => e.url === 'http://hl7.org.au/fhir/StructureDefinition/sex-characteristic-variation'
        )?.valueCodeableConcept;

        religionCodeableConcept = resource.extension?.find(
            e => e.url === 'http://hl7.org/fhir/StructureDefinition/patient-religion'
        )?.valueCodeableConcept;

        culturalBackground = resource.extension?.find(
            e => e.url === 'http://healthintersections.com.au/fhir/StructureDefinition/patient-cultural-background'
        )?.valueString;

        communityAffiliation = resource.extension?.find(
            e => e.url === 'http://hl7.org.au/fhir/StructureDefinition/community-affiliation'
        )?.valueString;
    });
</script>

{#if resource.name}
    <strong>
        {#if resource.name[0]}
            {#if resource.name[0].text}
                {resource.name[0].text}
            {:else}
                {resource.name[0].prefix ?? ""}
                {resource.name[0].given ? resource.name[0].given.join(' ') : ""}
                {resource.name[0].family ?? ""}
            {/if}
        <!-- TODO: This doesn't pass type checking, but may be necessary for some example data
        {:else}
            {resource.name.prefix ?? ""}
            {resource.name.given ? resource.name.given.join(' ') : ""}
            {resource.name.family ?? ""}
        -->
        {/if}
    </strong>
    <br>
{:else }
    <em>(No name)</em><br>
{/if}

{#if resource.birthDate}
    Birth Date: {resource.birthDate}<br>
{/if}
{#if resource.gender}
    Gender: {resource.gender ?? ""}<br>
{/if}
{#if genderIdentityCodeableConcept}
    Gender Identity: <CodeableConceptTemplate codeableConcept={genderIdentityCodeableConcept} />
{/if}
{#if pronounsCodeableConcept}
    Pronouns: <CodeableConceptTemplate codeableConcept={pronounsCodeableConcept} />
{/if}
{#if sexCharacteristicsCodeableConcept}
    Sex Characteristic Variations? <CodeableConceptTemplate codeableConcept={sexCharacteristicsCodeableConcept} />
{/if}
{#if religionCodeableConcept}
    Religion: <CodeableConceptTemplate codeableConcept={religionCodeableConcept} />
{/if}
{#if culturalBackground}
    Cultural Background: {culturalBackground}<br>
{/if}
{#if communityAffiliation}
    Community Affiliation: {communityAffiliation}<br>
{/if}
{#if resource.telecom || resource.address || resource.contact}
    <Button
        class="my-1"
        size="sm"
        color={!showContact ? "secondary" : "primary"}
        outline
        on:click={() => showContact = !showContact}>
        {showContact ? 'Hide' : 'Show'} contact information <Icon style="font-size: x-small;"name={!showContact ? "caret-down" : "caret-up"} />
    </Button>
    {#if showContact}
        <div style="overflow: scroll;">
            {#if resource.telecom}
                <table class="table table-bordered table-sm">
                    <thead>
                        <tr><th colspan="3">Contact Information</th></tr>
                    </thead>
                    <tbody>
                        {#each resource.telecom as telecom}
                            <tr>
                                <td>{telecom.system ?? ""}</td>
                                <td>{telecom.use ?? ""}</td>
                                <td>{telecom.value ?? ""}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}
            {#if resource.address}
                <table class="table table-bordered table-sm">
                    <thead>
                        <tr>
                        <th scope="col">Use</th>
                        <th scope="col">Address</th>
                        </tr>
                        <tr></tr>
                    </thead>
                    <tbody>
                        {#each resource.address as address}
                            <tr>
                            <td>{address.use ?? ""}</td>
                            <td>
                                {#if address.line}
                                    {#each address.line as line}
                                        {line}<br>
                                    {/each}
                                {/if}
                                {address.city ? address.city+"," : ""}{
                                    address.state
                                        ? ` ${address.state}`+(address.country ? "," : "")
                                        : ''
                                }{address.country
                                    ? ` ${address.country}`
                                    : ''}
                                {address.postalCode ?? ""}
                            </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}
            {#if resource.contact}
                {#each resource.contact as contact}
                    <strong>Emergency Contact:</strong><br>
                    {#if contact.relationship}
                        {#each contact.relationship as relationship, index}
                            {#if relationship.coding && relationship.coding[0].display}
                                <Badge color="secondary">{relationship.coding[0].display}</Badge>
                            {/if}
                            {#if index < contact.relationship.length - 1}
                                <br>
                            {/if}
                        {/each}
                    {/if}
                    {#if contact.name}
                        <strong>
                            {contact.name.prefix ?? ""}
                            {contact.name.given ? contact.name.given.join(' ') : ""}
                            {contact.name.family ?? ""}
                        </strong>
                        <br>
                    {/if}
                    {#if contact.telecom}
                        <table class="table table-bordered table-sm">
                            <thead>
                                <tr><th colspan="3">Contact Information</th></tr>
                            </thead>
                            <tbody>
                                {#each contact.telecom as telecom}
                                    <tr>
                                        <td>{telecom.system ?? ""}</td>
                                        <td>{telecom.use ?? ""}</td>
                                        <td>{telecom.value ?? ""}</td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    {/if}
                    {#if contact.address}
                        <table class="table table-bordered table-sm">
                            <thead>
                                <tr>
                                <th scope="col">Use</th>
                                <th scope="col">Address</th>
                                </tr>
                                <tr></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{contact.address.use ?? ""}</td>
                                    <td>
                                        {#if contact.address.line}
                                            {#each contact.address.line as line}
                                                {line}<br>
                                            {/each}
                                        {/if}
                                        {contact.address.city ? contact.address.city+"," : ""}{
                                            contact.address.state
                                                ? ` ${contact.address.state}`+(contact.address.country ? "," : "")
                                                : ''
                                        }{contact.address.country
                                            ? ` ${contact.address.country}`
                                            : ''}
                                        {contact.address.postalCode ?? ""}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    {/if}
                {/each}
            {/if}
        </div>
    {/if}
{/if}
