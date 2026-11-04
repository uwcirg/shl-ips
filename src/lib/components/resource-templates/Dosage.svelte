<script context="module" lang="ts">
  import type { Dosage, Period } from 'fhir/r4';
  import { quantityText } from '$lib/components/resource-templates/Medication.svelte';

  // The periods a Timing is expressed in (UCUM codes), as words. Only these are worded here; other
  // units are shown as given.
  const PERIOD_UNITS: Record<string, string> = { s: 'second', min: 'minute', h: 'hour', d: 'day', wk: 'week', mo: 'month', a: 'year' };

  // The name of one of those periods for a count, e.g. "day", "days". The wording is ours, so it is
  // inflected.
  function periodName(count: number, unit: string): string {
    const word = PERIOD_UNITS[unit];
    return !word ? unit : count === 1 ? word : `${word}s`;
  }

  // A dosage with no text of its own, described from the fields it has, as
  // "{quantity} {unit} [every {period} | {count} times in total] ({route})",
  // e.g. "1 tablet every 1 day (Oral)". A bounds period (when it
  // applies) is returned separately, since it is shown as a date. Undefined when there is nothing
  // to describe.
  export function dosageSentence(dosage: Dosage): { text: string, bounds?: Period } | undefined {
    const repeat = dosage.timing?.repeat;
    const doseQuantity = dosage.doseAndRate?.[0]?.doseQuantity;
    const dose = quantityText(doseQuantity);
    const hasFrequency = repeat?.period !== undefined && !!repeat.periodUnit;
    const timing = hasFrequency
      ? `every ${repeat!.period} ${periodName(repeat!.period!, repeat!.periodUnit!)}`
      : repeat?.count !== undefined ? `${repeat.count} times in total` : undefined;
    const route = dosage.route?.coding?.[0]?.display;
    const text = [[dose, timing].filter(Boolean).join(' '), route ? `(${route})` : undefined].filter(Boolean).join(' ');
    // The bounds stand in for a frequency that isn't given
    const bounds = !hasFrequency ? repeat?.boundsPeriod : undefined;
    return text || bounds ? { text, bounds } : undefined;
  }
</script>

<script lang="ts">
  import Date from '$lib/components/resource-templates/Date.svelte';

  export let dosages: Dosage[] | undefined;
</script>

{#if dosages && dosages.length > 0}
  {#each dosages as dosage}
    {#if dosage.text}
      {dosage.text}
    {:else if dosage.patientInstruction}
      {dosage.patientInstruction}
    {:else if dosage.asNeededBoolean}
      As needed
    {:else}
      {@const sentence = dosageSentence(dosage)}
      {#if sentence}
        {sentence.text}{#if sentence.bounds}{sentence.text ? ', ' : ''}<Date period fields={{ period: sentence.bounds }} />{/if}
      {/if}
    {/if}
  {/each}
{/if}
