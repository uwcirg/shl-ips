<script lang="ts">
  import type { Resource } from 'fhir/r4';
  import { Badge } from '@sveltestrap/sveltestrap';
  import type { ResourceTemplateParams } from '$lib/utils/types';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';
  import { formatDate, choiceDTFields } from '$lib/utils/util';

  export let content: ResourceTemplateParams<Resource>; // Define a prop to pass the data to the component

  let resource: Resource;
  $: if (content) resource = content.resource;

  // Fields checked in priority order, since a resource will only ever surface one of each kind
  const CONCEPT_FIELDS = ['code', 'type', 'category', 'class'];
  const DATE_FIELDS = ['effectiveDateTime', 'occurrenceDateTime', 'performedDateTime', 'authoredOn', 'recordedDate', 'issued', 'date', 'created', 'whenHandedOver', 'sent'];
  const PERIOD_FIELDS = ['effectivePeriod', 'occurrencePeriod', 'performedPeriod', 'period'];
  const NOISE_KEYS = new Set(['resourceType', 'id', 'meta', 'text', 'contained', 'extension', 'modifierExtension', 'implicitRules', 'language']);

  function isCodeableConcept(value: any): boolean {
    return !!value && typeof value === 'object' && !Array.isArray(value) &&
      (Array.isArray(value.coding) || typeof value.text === 'string');
  }

  function isCoding(value: any): boolean {
    return isCodeableConcept(value) || Array.isArray(value) && value.every(isCodeableConcept);
  }

  function isSimpleValue(value: any): boolean {
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
  }

  function humanize(key: string): string {
    return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
  }

  // Handles Patient/Practitioner/RelatedPerson-style HumanName arrays as well as
  // Location/Organization-style plain string names
  function resolveName(value: any): string | undefined {
    if (!value) return undefined;
    const entry = Array.isArray(value) ? value[0] : value;
    if (!entry) return undefined;
    if (typeof entry === 'string') return entry;
    if (typeof entry.text === 'string') return entry.text;
    const parts = [entry.prefix, entry.given, entry.family].flat().filter(Boolean);
    return parts.length > 0 ? parts.join(' ') : undefined;
  }

  let status: string | undefined;
  let title: string | undefined;
  let titleConcept: any;
  let concept: any;
  let dateLabel: string | undefined;
  let dateValue: string | undefined;
  let otherFields: Array<[string, string | number | boolean]> = [];

  let dateField: string | undefined;
  let periodField: string | undefined;

  $: if (resource) {
    const r: any = resource;

    status = typeof r.status === 'string' ? r.status : undefined;

    const name = resolveName(r.name);
    // A field like vaccineCode/medicationCodeableConcept/valueCodeableConcept identifies the
    // resource as strongly as a name would, so it's shown the same way when there's no name
    const codeField = !name
      ? Object.keys(r).find((k) => k !== 'resourceType' && k.toLowerCase().includes('code') && isCodeableConcept(r[k]))
      : undefined;
    titleConcept = codeField ? r[codeField] : undefined;
    title = name ?? (!titleConcept ? (r.title ?? r.description ?? undefined) : undefined);

    const conceptField = CONCEPT_FIELDS.find((f) => isCoding(r[f]));
    concept = conceptField ? (Array.isArray(r[conceptField]) ? r[conceptField] : [r[conceptField]]) : undefined;

    dateField = DATE_FIELDS.find((f) => typeof r[f] === 'string');
    periodField = !dateField ? PERIOD_FIELDS.find((f) => r[f]?.start || r[f]?.end) : undefined;
    if (dateField) {
      dateLabel = humanize(dateField.replace(/DateTime$/, ''));
      dateValue = formatDate(r[dateField]);
    } else if (periodField) {
      dateLabel = humanize(periodField.replace(/Period$/, ''));
      dateValue = `${formatDate(r[periodField].start)}${r[periodField].end ? ' - ' + formatDate(r[periodField].end) : ''}`;
    } else {
      dateLabel = undefined;
      dateValue = undefined;
    }

    const excluded = new Set([...NOISE_KEYS, 'status', 'title', 'description', 'identifier', 'name', conceptField, codeField, dateField, periodField].filter(Boolean));
    otherFields = Object.entries(r).filter(([key, value]) => !excluded.has(key) && isSimpleValue(value)).slice(0, 6) as Array<[string, string | number | boolean]>;
  }

</script>

<div class="generic-resource">
  {#if status}
    <div class="d-flex flex-wrap align-items-center gap-1 mb-1">
      <Badge color="primary">{status}</Badge>
    </div>
  {/if}
  {#if title}
    {#if typeof(title) === 'string'}
      <div class="fw-bold">{title}</div>
    {:else}
      <CodeableConcept codeableConcept={title} />
    {/if}
  {:else if titleConcept}
    <CodeableConcept codeableConcept={titleConcept} badge={false} />
  {:else if concept?.length > 0}
    {#each concept as c}
      <CodeableConcept codeableConcept={c} badge={false} />
    {/each}
  {/if}
  {#if dateField}
    <div class="text-secondary small"><Date fields={choiceDTFields(dateField, resource)} /></div>
  {:else if periodField}
    <div class="text-secondary small"><Date period fields={choiceDTFields(periodField, resource)} /></div>
  {/if}
  {#if otherFields.length > 0}
    <ul class="list-unstyled small text-secondary mb-1">
      {#each otherFields as [key, value]}
        <li><span class="fw-semibold">{humanize(key)}:</span> {value}</li>
      {/each}
    </ul>
  {/if}
</div>
