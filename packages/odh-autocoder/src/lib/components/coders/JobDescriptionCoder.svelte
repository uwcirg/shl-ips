<script lang="ts">
  import { Button, Col, FormGroup, Input, Label, Row, Spinner } from '@sveltestrap/sveltestrap';
  import type { CodingMode, IOResponse } from '../../types.js';
  import {
    getAutocoderClient,
    isNotCoded,
    notCoded,
    withoutNotCoded,
    type AutocoderClient
  } from '../../autocoder/client.js';
  import '../odh-layout.css';

  // Experimental job coder: the user describes the job in their own words, one autocoder request
  // codes the text as both occupation and industry, and they pick from each list of suggestions
  // (the top one is picked to start with). Same props as JobFieldsCoder.

  export let occupation: IOResponse | undefined;
  export let industry: IOResponse | undefined;
  /** Prefix for the inputs' element ids */
  export let idPrefix: string;
  /** Picks the default label's tense */
  export let tense: 'current' | 'past' = 'current';
  export let labels: { description?: string } = {};
  /** Defaults to the client from context (see setAutocoderClient) */
  export let client: AutocoderClient = getAutocoderClient();

  const MODES: CodingMode[] = ['Occupation', 'Industry'];

  let text = '';
  let codedText = '';
  let processing = false;
  let fetchError = '';
  let suggestions: Record<CodingMode, IOResponse[]> | undefined = undefined;

  $: label =
    labels.description ??
    (tense === 'current' ? 'Describe your job and where you work:' : 'Describe the job and where you worked:');

  function valueFor(mode: CodingMode) {
    return mode === 'Occupation' ? occupation : industry;
  }

  function choose(mode: CodingMode, value: IOResponse) {
    if (mode === 'Occupation') {
      occupation = value;
    } else {
      industry = value;
    }
  }

  async function code() {
    const query = text.trim();
    if (!query || query === codedText || processing) {
      return;
    }
    processing = true;
    fetchError = '';
    try {
      const content = await client.code({ occupation: query, industry: query });
      suggestions = {
        Occupation: [...withoutNotCoded(content.Occupation), notCoded('Occupation')],
        Industry: [...withoutNotCoded(content.Industry), notCoded('Industry')]
      };
      for (const mode of MODES) {
        choose(mode, suggestions[mode][0]);
      }
      codedText = query;
    } catch {
      suggestions = undefined;
      fetchError = 'Coding service unavailable. Your description is saved without codes.';
      // Keep the user's text, under each field's not-coded code
      for (const mode of MODES) {
        choose(mode, { ...notCoded(mode), Title: query });
      }
    } finally {
      processing = false;
    }
  }
</script>

<Row class="mb-2 gy-2">
  <Col xs="auto" class="odh-inline-group odh-grow">
    <label class="odh-label" for={`${idPrefix}-description`}>{label}</label>
    <div class="odh-control">
      <Input
        id={`${idPrefix}-description`}
        type="textarea"
        rows={2}
        placeholder="e.g. I'm a night shift nurse at a county hospital"
        bind:value={text}
        on:blur={code}
      />
      <div class="d-flex align-items-center gap-2 mt-1">
        <Button size="sm" color="secondary" outline disabled={processing || !text.trim()} on:click={code}>
          Find codes
        </Button>
        {#if processing}
          <Spinner type="border" size="sm" color="secondary" />
        {/if}
      </div>
      {#if fetchError}
        <div class="small text-danger mt-1">{fetchError}</div>
      {/if}
      {#if suggestions}
        {#each MODES as mode}
          <FormGroup class="mt-2 mb-0 small" tag="fieldset">
            <legend class="fs-6 mb-1">{mode}</legend>
            {#each suggestions[mode] as option, index}
              <div class="form-check" class:mt-1={isNotCoded(option) && index > 0}>
                <input
                  class="form-check-input"
                  type="radio"
                  id={`${idPrefix}-${mode}-${index}`}
                  name={`${idPrefix}-${mode}`}
                  checked={valueFor(mode)?.Code === option.Code && valueFor(mode)?.Title === option.Title}
                  on:change={() => choose(mode, option)}
                />
                <label class="form-check-label" for={`${idPrefix}-${mode}-${index}`}>{option.Title}</label>
              </div>
            {/each}
          </FormGroup>
        {/each}
      {:else}
        <Label class="small text-secondary mb-0 mt-1">
          {`Using "${occupation?.Title ?? notCoded('Occupation').Title}" and "${industry?.Title ?? notCoded('Industry').Title}"`}
        </Label>
      {/if}
    </div>
  </Col>
</Row>
