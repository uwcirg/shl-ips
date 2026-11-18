<script lang="ts">
  import { Col, Input, Row } from '@sveltestrap/sveltestrap';
  import {
    EMPLOYMENT_STATUSES,
    employmentStatusEntry,
    type EmploymentStatusEntry
  } from '../../fhir/values.js';
  import { getOdhFormContext } from '../../state/context.js';
  import { createOdhFormState } from '../../state/formState.js';
  import '../odh-layout.css';

  // The employment status section: always exactly one status, so no Add or Delete. Inside an
  // OdhFormProvider it uses the form's state; otherwise bind entry.

  /** The status entry, when not inside an OdhFormProvider */
  export let entry: EmploymentStatusEntry = employmentStatusEntry();
  export let label: string = 'I am currently:';
  /** Statuses to choose from: display text mapped to code (see EMPLOYMENT_STATUSES) */
  export let statuses: Record<string, string> = EMPLOYMENT_STATUSES;
  export let id: string = 'employment-status';

  const context = getOdhFormContext();
  context?.register('employmentStatus');
  const state = context?.state ?? createOdhFormState();
</script>

<Row class="mb-2 gy-2">
  <Col xs="auto" class="odh-inline-group">
    <label class="odh-label" for={id}>{label}</label>
    <div class="odh-control odh-status-control">
      {#if context}
        <Input {id} type="select" bind:value={$state.employmentStatus.status}>
          {#each Object.keys(statuses) as status}
            <option value={status}>{status}</option>
          {/each}
        </Input>
      {:else}
        <Input {id} type="select" bind:value={entry.status}>
          {#each Object.keys(statuses) as status}
            <option value={status}>{status}</option>
          {/each}
        </Input>
      {/if}
    </div>
  </Col>
</Row>
