<script lang="ts">
  import { Col, FormGroup, Row } from '@sveltestrap/sveltestrap';
  import type { CombatPeriodEntry } from '../../fhir/values.js';
  import MonthInput from '../MonthInput.svelte';
  import '../odh-layout.css';

  // Entry form for one period of combat zone or hazardous duty work. The "actions" slot goes at
  // the end of the last row.

  export let entry: CombatPeriodEntry;
  /** Prefix for element ids (unused here; part of the entry form props) */
  export let idPrefix: string = '';
  export let labels: { start?: string; end?: string } = {};
</script>

<FormGroup id={idPrefix || undefined}>
  <Row class="mb-2 gy-2">
    <Col xs="auto" class="odh-inline-group">
      <span class="odh-label">
        {labels.start ?? 'I started working in a combat zone or other hazardous conditions:'}
      </span>
      <MonthInput bind:value={entry.start} />
    </Col>
  </Row>
  <Row class="mb-4 pb-4 border-bottom gy-2">
    <Col xs="auto" class="odh-inline-group">
      <span class="odh-label">{labels.end ?? 'and stopped:'}</span>
      <MonthInput bind:value={entry.end} />
    </Col>
    <slot name="actions" />
  </Row>
</FormGroup>
