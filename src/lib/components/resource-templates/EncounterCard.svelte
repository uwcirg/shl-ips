<script lang="ts">
  import type { CodeableConcept as CodeableConceptType, Encounter } from 'fhir/r4';
  import type { CategorizedResource } from '$lib/stores/categorizedResources';
  import { choiceDTFields } from '$lib/utils/util';
  import ResourceDisplay from '$lib/components/app/ResourceDisplay.svelte';
  import CodeableConcept from '$lib/components/resource-templates/CodeableConcept.svelte';
  import Date from '$lib/components/resource-templates/Date.svelte';

  // Shared look for an Encounter and the resources it references, used by both the grouped display
  // (EncounterGroup) and the single-resource template (Encounter). The provider, participants and
  // locations are shown from the resources in `related` when the Encounter's reference to them
  // resolved, and otherwise from the display text the Encounter itself carries.
  // Slots: "actions" (top right of the header, for the Encounter) and "related-actions", rendered
  // beside each related resource with that resource's reference text as the `reference` slot prop.
  export let encounter: Encounter;
  // Related resources, keyed by the reference text the Encounter uses for them
  export let related: Record<string, CategorizedResource> = {};

  const conceptText = (concept?: CodeableConceptType) =>
    concept?.text ?? concept?.coding?.find((coding) => coding.display)?.display;
  const capitalize = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}`;

  // Types such as "Inpatient", "Hospital Encounter", "Urgent", without repeats
  $: types = [...new Set((encounter.type ?? []).map(conceptText).filter((text): text is string => !!text))];
  $: disposition = conceptText(encounter.hospitalization?.dischargeDisposition);

  interface Row {
    label: string;
    reference?: string; // the Encounter's reference to the resource; looks it up in `related`
    display?: string;   // text to show when there is no resolved resource
  }

  // The same person is often listed once per role, so list each person once with all their roles.
  // Locations are often repeated (e.g. once with a period, once without), so list each once.
  function relatedRows(encounter: Encounter): Row[] {
    const rows: Row[] = [];
    const provider = encounter.serviceProvider;
    if (provider?.reference || provider?.display) {
      rows.push({ label: 'Provider', reference: provider.reference, display: provider.display });
    }

    const people = new Map<string, { reference?: string, display?: string, roles: string[] }>();
    for (const participant of encounter.participant ?? []) {
      const reference = participant.individual?.reference;
      const display = participant.individual?.display;
      const key = reference ?? display;
      if (!key) continue;
      const person = people.get(key) ?? { reference, display, roles: [] };
      const role = conceptText(participant.type?.[0]);
      if (role && !person.roles.includes(role)) person.roles.push(role);
      people.set(key, person);
    }
    for (const { reference, display, roles } of people.values()) {
      rows.push({ label: roles.length > 0 ? roles.map(capitalize).join(', ') : 'Participant', reference, display });
    }

    const seen = new Set<string>();
    for (const entry of encounter.location ?? []) {
      const reference = entry.location?.reference;
      const name = entry.location?.display;
      const key = reference ?? name;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const kind = conceptText(entry.physicalType);
      rows.push({ label: 'Location', reference, display: name && kind ? `${kind} ${name}` : name });
    }
    return rows;
  }

  $: rows = relatedRows(encounter);
</script>

<div class="encounter-card border rounded-4 p-3">
  <div class="encounter-header">
    <div>
      {#if types.length > 0}
        <strong>{types.join(', ')}</strong>
      {/if}
    </div>
    <div class="encounter-actions">
      <slot name="actions" />
    </div>
  </div>

  <div class="encounter-rows">
    {#if encounter.class?.display}
      <div class="encounter-row">
        <span class="encounter-label">Class</span>
        <div class="encounter-value">{encounter.class.display}</div>
      </div>
    {/if}
    {#if encounter.serviceType}
      <div class="encounter-row">
        <span class="encounter-label">Service</span>
        <div class="encounter-value">{conceptText(encounter.serviceType)}</div>
      </div>
    {/if}
    {#each encounter.reasonCode ?? [] as reason}
      <div class="encounter-row">
        <span class="encounter-label">Reason</span>
        <div class="encounter-value"><CodeableConcept codeableConcept={reason} bold={false} /></div>
      </div>
    {/each}
    {#if encounter.period}
      <div class="encounter-row">
        <span class="encounter-label">Date</span>
        <div class="encounter-value"><Date fields={choiceDTFields('period', encounter)} /></div>
      </div>
    {/if}
    {#if disposition}
      <div class="encounter-row">
        <span class="encounter-label">Discharge</span>
        <div class="encounter-value">{disposition}</div>
      </div>
    {/if}
  </div>

  {#if rows.length > 0}
    <div class="encounter-rows encounter-divided">
      {#each rows as row}
        {@const resolved = row.reference ? related[row.reference] : undefined}
        <div class="encounter-row">
          <span class="encounter-label">{row.label}</span>
          <div class="encounter-value">
            {#if resolved}
              <ResourceDisplay resource={resolved.rh.resource} renderInfo={resolved.renderInfo} />
            {:else}
              {row.display ?? ''}
            {/if}
          </div>
          {#if resolved && row.reference}
            <div class="encounter-actions">
              <slot name="related-actions" reference={row.reference} />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .encounter-card {
    background: var(--bs-body-bg);
  }
  .encounter-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .encounter-header + .encounter-rows {
    margin-top: 0.25rem;
  }
  /* Details of the Encounter itself, then the resources it references as a separate block */
  .encounter-divided {
    margin-top: 0.6rem;
    padding-top: 0.6rem;
    border-top: 1px solid var(--bs-border-color-translucent, rgba(0, 0, 0, 0.1));
  }
  .encounter-row {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.1rem 0;
  }
  .encounter-divided .encounter-row {
    padding: 0.3rem 0;
  }
  .encounter-label {
    flex: 0 0 8rem;
    font-size: 0.85rem;
    color: var(--bs-secondary-color, #6c757d);
  }
  .encounter-value {
    flex: 1 1 auto;
    min-width: 0;
    overflow-wrap: anywhere;
  }
</style>
