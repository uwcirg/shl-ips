<script lang="ts">
  import { Badge, Button, Icon } from '@sveltestrap/sveltestrap';
  import type { BundleEntry, DiagnosticReport, Observation } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import ObservationTemplate from '$lib/components/resource-templates/Observation.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import { getEntry, choiceDTFields } from '$lib/utils/util';
  import { hasChoiceDTField } from '$lib/utils/util';

  export let content: ResourceTemplateParams<DiagnosticReport>; // Define a prop to pass the data to the component

  let resource: DiagnosticReport;
  $: if (content) resource = content.resource;

  let showResults = false;

  // handle DiagnosticReport.result references
  interface ResolvedResult {
    resource?: Observation;
    display?: string;
  }
  let results: ResolvedResult[] = [];
  
  $: {
    if (resource?.result) {
      results = resource.result.reduce<ResolvedResult[]>((acc, result) => {
        let resultFields: ResolvedResult = {};
  
        if (result.reference) {
          let resultResource: Observation | undefined;
          if (resource.contained?.[0]?.resourceType === 'Observation') {
            resultResource = resource.contained[0] as Observation;
          } else {
            resultResource = getEntry(content.entries as BundleEntry[], result.reference) as Observation;
          }
          if (resultResource) {
            resultFields.resource = resultResource;
          }
        }
  
        if (result.display) {
          resultFields.display = result.display;
        }
  
        if (Object.keys(resultFields).length > 0) {
          acc.push(resultFields);
        }
  
        return acc;
      }, []);
    } else {
      results = [];
    }
  }
</script>

{#if resource.category?.[0].coding}
  <Badge color="primary">
    {resource.category[0].coding[0].display ?? resource.category[0].coding[0].code}
  </Badge><br>
{/if}
<CodeableConcept codeableConcept={resource.code} />
Effective: <Date fields={choiceDTFields("effective", resource)} />
<br>
{#if resource.result}
  <Button
    class="my-1"
    size="sm"
    color={!showResults ? "secondary" : "primary"}
    outline
    on:click={() => showResults = !showResults}>
    {showResults ? 'Hide' : 'Show'} {resource.result.length} result{resource.result.length > 1 ? 's' : ''} <Icon style="font-size: x-small;"name={!showResults ? "caret-down-fill" : "caret-up-fill"} />
  </Button><br>
  {#if showResults}
  <table class="table table-bordered table-sm">
    <thead>
      <tr><th>Results</th></tr>
    </thead>
    <tbody>
    {#each results as result}
      <tr>
        <td>
          <div class="ml-4">
            {#if result.resource}
              <ObservationTemplate
                content={{ resource: result.resource, entries: content.entries }}
                contained={hasChoiceDTField("effective", result.resource)}
              />
            {:else if result.display}
              {result.display}
            {/if}
          </div>
        </td>
      </tr>
    {/each}
    </tbody>
  </table>
  {/if}
{/if}
