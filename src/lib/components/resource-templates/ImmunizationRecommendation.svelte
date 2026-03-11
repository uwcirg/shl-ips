<script lang="ts">
  import type { ImmunizationRecommendation } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import DateComponent from '$lib/components/resource-templates/Date.svelte';
  import { hasChoiceDTField, choiceDTFields } from '$lib/utils/util';
  
  export let content: ResourceTemplateParams<ImmunizationRecommendation>; // Define a prop to pass the data to the component

  let resource: ImmunizationRecommendation;
  $: if (content) resource = content.resource;

  let recommendations: ImmunizationRecommendation[] = [];
  $: if (resource && resource.recommendation?.length > 0) {
    recommendations = resource.recommendation
      ?.sort((a, b) => {
        if (!a.dateCriterion) return -1;
        if (!b.dateCriterion) return 1;
        const aDate = a.dateCriterion?.find((x) => x.code.coding[0].code === '30981-5' && x.code.coding[0].system == 'http://hl7.org/fhir/ValueSet/immunization-recommendation-date-criterion')?.value;
        const bDate = b.dateCriterion?.find((x) => x.code.coding[0].code === '30981-5' && x.code.coding[0].system == 'http://hl7.org/fhir/ValueSet/immunization-recommendation-date-criterion')?.value;
        return new Date(aDate) - new Date(bDate);
      })
      ?.filter(r => {
        return !(
          r.forecastStatus?.coding?.find((x) => x.code === 'Aged Out' && x.system == 'http://hl7.org/fhir/ValueSet/immunization-recommendation-status') ||
          r.forecastStatus?.coding?.find((x) => x.code === 'Complete' && x.system == 'http://hl7.org/fhir/ValueSet/immunization-recommendation-status')
        );
      });
  }
</script>
{#if resource.vaccineCode}
  <CodeableConcept codeableConcept={resource.vaccineCode} />
{/if}

{#if hasChoiceDTField("date", resource)}
  Recommendation Date: {resource.date.split('T')[0]}
  <!-- <Date fields={choiceDTFields("date", resource)} /> -->
  <br>
{/if}

{#if recommendations && recommendations?.length > 0}
  <table class="table table-bordered table-sm mt-2">
    <thead>
      <tr>
        <th>Vaccination Name</th>
        <th>Status</th>
        <th>Earliest Date</th>
        <th>Recommended Date</th>
      </tr>
    </thead>
    <tbody>
      {#each recommendations as recommendation}
        {@const earliestDate = recommendation.dateCriterion?.find((x) => x.code.coding[0].code === '30981-5' && x.code.coding[0].system == 'http://hl7.org/fhir/ValueSet/immunization-recommendation-date-criterion')}
        {@const recommendedDate = recommendation.dateCriterion?.find((x) => x.code.coding[0].code === '30980-7' && x.code.coding[0].system == 'http://hl7.org/fhir/ValueSet/immunization-recommendation-date-criterion')}
        <tr>
          <td>
            {#if recommendation.vaccineCode?.length > 0}
              <CodeableConcept codeableConcept={recommendation.vaccineCode[0]} />
            {/if}
          </td>
          <td>
            {#if recommendation.forecastStatus}
              <CodeableConcept codeableConcept={recommendation.forecastStatus} badge={false} bold={false} />
            {/if}
          </td>
          <td>
            {#if earliestDate}
              <DateComponent fields={choiceDTFields("value", earliestDate)} />
            {/if}
          </td>
          <td>
            {#if recommendedDate}
              <DateComponent fields={choiceDTFields("value", recommendedDate)} />
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{:else}
  <div>No Recommended Immunizations</div>
{/if}