<script lang="ts">
  import { Col, Row } from '@sveltestrap/sveltestrap';
  import type { ComponentType } from 'svelte';
  import type { IOResponse } from '../../types.js';
  import AutocoderSearchInput from './AutocoderSearchInput.svelte';
  import '../odh-layout.css';

  // Job coder: codes a job's occupation and industry. This one is a labeled field coder for
  // each. Job coders share these props, so a section can use any of them (see JobDescriptionCoder).

  export let occupation: IOResponse | undefined;
  export let industry: IOResponse | undefined;
  /** Prefix for the inputs' element ids */
  export let idPrefix: string;
  /** Picks the default labels' tense */
  export let tense: 'current' | 'past' = 'current';
  export let labels: { occupation?: string; industry?: string } = {};
  /** Field coder for each field (props: mode, bind:value, id) */
  export let fieldCoder: ComponentType = AutocoderSearchInput;

  const DEFAULT_LABELS = {
    current: {
      occupation: 'I work as a(n):',
      industry: "My company's primary business activity is:"
    },
    past: {
      occupation: 'I used to work as a(n):',
      industry: "My company's primary business activity was:"
    }
  };

  $: occupationLabel = labels.occupation ?? DEFAULT_LABELS[tense].occupation;
  $: industryLabel = labels.industry ?? DEFAULT_LABELS[tense].industry;
</script>

<Row class="mb-2 gy-2">
  <Col xs="auto" class="odh-inline-group odh-grow">
    <span class="odh-label">{occupationLabel}</span>
    <div class="odh-control">
      <svelte:component this={fieldCoder} bind:value={occupation} mode="Occupation" id={`${idPrefix}-occupation`} />
    </div>
  </Col>
</Row>
<Row class="mb-2 gy-2">
  <Col xs="auto" class="odh-inline-group odh-grow">
    <span class="odh-label">{industryLabel}</span>
    <div class="odh-control">
      <svelte:component this={fieldCoder} bind:value={industry} mode="Industry" id={`${idPrefix}-industry`} />
    </div>
  </Col>
</Row>
