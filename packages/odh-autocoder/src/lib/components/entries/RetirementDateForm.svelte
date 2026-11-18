<script lang="ts">
  import { Col, FormGroup, Row } from '@sveltestrap/sveltestrap';
  import type { RetirementDateEntry } from '../../fhir/values.js';
  import MonthInput from '../MonthInput.svelte';
  import '../odh-layout.css';

  // Entry form for one retirement date. The "actions" slot goes at the end of the row.

  export let entry: RetirementDateEntry;
  /** Prefix for element ids (unused here; part of the entry form props) */
  export let idPrefix: string = '';
  export let labels: { start?: string } = {};
</script>

<FormGroup id={idPrefix || undefined}>
  <Row class="mb-4 pb-4 border-bottom gy-2">
    <Col xs="auto" class="odh-inline-group">
      <span class="odh-label">{labels.start ?? 'I retired in:'}</span>
      <MonthInput bind:value={entry.start} />
    </Col>
    <slot name="actions" />
  </Row>
</FormGroup>
