<script context="module" lang="ts">
  import type { Medication, Quantity } from 'fhir/r4';

  // A unit that is a full word ("tablet", "puff") reads with a space after the number; a short
  // symbol ("mg", "mL", "mcg") is written against it. Units are always shown as given, never
  // altered (e.g. pluralized), since the source's own wording is the only reliable one.
  export const isWordUnit = (unit: string) => /^[A-Za-z][A-Za-z ]{3,}$/.test(unit);

  // A quantity as text, e.g. "325mg" or "2 tablet"
  export function quantityText(quantity: Pick<Quantity, 'value' | 'unit'> | undefined): string | undefined {
    if (!quantity || (quantity.value === undefined && !quantity.unit)) return undefined;
    let unitText = quantity.unit?.toLowerCase();
    if (quantity.value === undefined) return unitText;
    if (!unitText) return String(quantity.value);
    return `${quantity.value}${isWordUnit(unitText) ? ' ' : ''}${unitText}`;
  }

  // An ingredient's strength in plain words, e.g. "325mg per tablet" or "250mg per 5 mL". A
  // denominator of 1 is just its unit; any other quantity keeps its number, with the unit as given.
  export function strengthText(strength: { numerator?: Quantity, denominator?: Quantity } | undefined): string | undefined {
    const numerator = strength?.numerator;
    if (numerator?.value === undefined) return undefined;
    const text = quantityText(numerator);
    const denominator = strength?.denominator;
    if (!denominator || (denominator.value === undefined && !denominator.unit)) return text;
    const per = denominator.value === undefined || denominator.value === 1 ? denominator.unit : quantityText(denominator);
    return per ? `${text} per ${per}` : text;
  }
</script>

<script lang="ts">
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';

  export let content: ResourceTemplateParams<Medication>; // Define a prop to pass the data to the component

  let resource: Medication;
  $: if (content) resource = content.resource;

  const conceptText = (concept?: { text?: string, coding?: Array<{ display?: string, code?: string }> }) =>
    concept?.text ?? concept?.coding?.find((coding) => coding.display)?.display ?? concept?.coding?.[0]?.code;

  // Each ingredient with a strength; a combination product names each ingredient it lists
  $: strengths = (resource?.ingredient ?? [])
    .map((ingredient) => ({
      name: conceptText(ingredient.itemCodeableConcept),
      text: strengthText(ingredient.strength)
    }))
    .filter((strength): strength is { name: string | undefined, text: string } => !!strength.text);
</script>

{#if resource.code}
  <CodeableConcept codeableConcept={resource.code} />
{/if}
{#each strengths as strength}
  <div>{strengths.length > 1 && strength.name ? `${strength.name}: ` : ''}{strength.text}</div>
{/each}
