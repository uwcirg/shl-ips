<script lang="ts">
  /**
   * Surfaces AI provenance for a single resource, per the HL7 AI Transparency on
   * FHIR IG. Renders nothing at all when the resource carries no AI labelling,
   * so resources without provenance look exactly as they did before.
   */
  import { Icon, Modal, ModalBody, ModalHeader } from '@sveltestrap/sveltestrap';
  import type { Resource } from 'fhir/r4';
  import {
    getAiProvenance,
    type AiProvenanceIndex,
    type AiProvenanceSummary
  } from '$lib/utils/aiProvenance';

  export let resource: Resource | undefined = undefined;
  export let index: AiProvenanceIndex | undefined = undefined;
  /** Pass a pre-computed summary instead of resource+index, if you have one. */
  export let summary: AiProvenanceSummary | undefined = undefined;

  let details: AiProvenanceSummary | undefined;
  $: details = summary ?? (index?.hasAny ? getAiProvenance(resource, index) : undefined);

  let isOpen = false;
  function toggle() {
    isOpen = !isOpen;
  }
  function open(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    isOpen = true;
  }

  // Scope: the IG lets a producer label the whole resource, individual elements,
  // or both, and telling those apart is the point of the second success criterion.
  $: scopeLabel = !details
    ? ''
    : details.resourceLevel && details.elementLevel.length > 0
      ? 'Whole resource, plus specific fields'
      : details.resourceLevel
        ? 'Whole resource'
        : `${details.elementLevel.length} field${details.elementLevel.length === 1 ? '' : 's'} only`;

  $: scopeShort = !details
    ? ''
    : details.resourceLevel && details.elementLevel.length > 0
      ? 'resource + fields'
      : details.resourceLevel
        ? 'whole resource'
        : `${details.elementLevel.length} field${details.elementLevel.length === 1 ? '' : 's'}`;

  $: reviewIcon =
    details?.humanReview === 'verified'
      ? 'patch-check-fill'
      : details?.humanReview === 'involved'
        ? 'person'
        : 'exclamation-triangle';

  $: reviewShort =
    details?.humanReview === 'verified'
      ? 'Human-reviewed'
      : details?.humanReview === 'involved'
        ? 'Human involved'
        : 'No human review';

  function modelCardName(card: { title?: string; format?: string }, position: number): string {
    return card.title ?? card.format ?? `Model card ${position}`;
  }
</script>

{#if details}
  <span class="ai-provenance" title={`${details.involvementLabel} — ${reviewShort} — ${scopeLabel}`}>
    <button
      type="button"
      class="ai-pill ai-pill-{details.involvement}"
      on:click={open}
      aria-label={`AI provenance: ${details.involvementLabel}, ${reviewShort}, ${scopeLabel}. Show details.`}
    >
      <Icon name="cpu" />
      <span class="ai-pill-text">{details.badgeLabel}</span>
      <span class="ai-pill-scope">{scopeShort}</span>
    </button>
    <button
      type="button"
      class="ai-pill ai-pill-review-{details.humanReview}"
      on:click={open}
      aria-label={`${reviewShort}. Show AI provenance details.`}
    >
      <Icon name={reviewIcon} />
      <span class="ai-pill-text">{reviewShort}</span>
    </button>
  </span>

  <Modal {isOpen} {toggle} scrollable size="lg">
    <ModalHeader {toggle}>AI provenance</ModalHeader>
    <ModalBody>
      <div class="ai-detail">
        <section>
          <h6 class="ai-heading">Was AI involved?</h6>
          <p class="ai-lead">
            <Icon name="cpu" /> Yes — <strong>{details.involvementLabel.toLowerCase()}</strong>.
          </p>
          <p class="ai-note">{details.involvementDetail}</p>
          {#if details.activities.length > 0}
            <ul class="ai-list">
              {#each details.activities as activity}
                <li>{activity}</li>
              {/each}
            </ul>
          {/if}
          {#if details.aiAgents.length > 0}
            <ul class="ai-list">
              {#each details.aiAgents as agent}
                <li><span class="ai-role">{agent.typeLabel}</span> {agent.display}</li>
              {/each}
            </ul>
          {/if}
        </section>

        <section>
          <h6 class="ai-heading">Did a human review it?</h6>
          <p class="ai-lead">
            <Icon name={reviewIcon} /> <strong>{details.humanReviewLabel}</strong>
          </p>
          <p class="ai-note">{details.humanReviewDetail}</p>
          {#if details.humanAgents.length > 0}
            <ul class="ai-list">
              {#each details.humanAgents as agent}
                <li><span class="ai-role">{agent.typeLabel}</span> {agent.display}</li>
              {/each}
            </ul>
          {/if}
        </section>

        <section>
          <h6 class="ai-heading">What is labelled?</h6>
          <p class="ai-lead"><Icon name="bullseye" /> <strong>{scopeLabel}</strong></p>
          {#if details.resourceLevel}
            <p class="ai-subheading">Resource-level labelling</p>
            <ul class="ai-list">
              {#each details.resourceLevelSources as reason}
                <li>{reason}</li>
              {/each}
            </ul>
            {#if details.resourceConfidence}
              <p class="ai-note">AI confidence for the resource: <strong>{details.resourceConfidence.display}</strong></p>
            {/if}
          {:else}
            <p class="ai-note">
              The resource as a whole is not labelled as AI-involved; only the fields listed below are.
            </p>
          {/if}
          {#if details.elementLevel.length > 0}
            <p class="ai-subheading">Element-level labelling</p>
            <ul class="ai-list">
              {#each details.elementLevel as element}
                <li>
                  <code>{element.path}</code>
                  {#if element.confidence}
                    <span class="ai-note"> — AI confidence {element.confidence.display}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </section>

        {#if details.devices.length > 0}
          <section>
            <h6 class="ai-heading">The AI system</h6>
            {#each details.devices as device}
              <p class="ai-lead"><Icon name="robot" /> <strong>{device.display}</strong></p>
              <ul class="ai-list">
                {#if device.manufacturer}<li>Manufacturer: {device.manufacturer}</li>{/if}
                {#if device.modelNumber}<li>Model: {device.modelNumber}</li>{/if}
                {#if device.version}<li>Version: {device.version}</li>{/if}
                {#each device.kinds as kind}<li>Kind of AI: {kind}</li>{/each}
                {#if device.url}
                  <li><a href={device.url} target="_blank" rel="noopener noreferrer">{device.url}</a></li>
                {/if}
              </ul>

              {#if device.modelCards.length > 0}
                <p class="ai-subheading">Model card</p>
                {#each device.modelCards as card, cardIndex}
                  <div class="ai-card">
                    <div class="ai-card-head">
                      <strong>{modelCardName(card, cardIndex + 1)}</strong>
                      <span class="ai-source">{card.sourceLabel}</span>
                    </div>
                    {#if card.format}<div class="ai-note">Format: {card.format}</div>{/if}
                    {#if card.description}<p class="ai-card-text">{card.description}</p>{/if}
                    {#if card.text}<pre class="ai-card-pre">{card.text}</pre>{/if}
                    {#each card.links as link}
                      <div>
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          <Icon name="box-arrow-up-right" /> {link.contentType ?? 'Open model card'}
                        </a>
                        <span class="ai-note"> {link.url}</span>
                      </div>
                    {/each}
                  </div>
                {/each}
              {:else}
                <p class="ai-note">No model card was provided for this AI system.</p>
              {/if}
            {/each}
          </section>
        {/if}

        {#if details.inputPrompts.length > 0}
          <section>
            <h6 class="ai-heading">Input prompt</h6>
            {#each details.inputPrompts as prompt}
              <div class="ai-card">
                {#if prompt.title}<div class="ai-card-head"><strong>{prompt.title}</strong></div>{/if}
                {#if prompt.description}<p class="ai-card-text">{prompt.description}</p>{/if}
                {#if prompt.text && prompt.text !== prompt.description}
                  <pre class="ai-card-pre">{prompt.text}</pre>
                {/if}
              </div>
            {/each}
          </section>
        {/if}

        {#if details.recorded.length > 0}
          <section>
            <h6 class="ai-heading">Recorded</h6>
            <ul class="ai-list">
              {#each details.recorded as timestamp}
                <li>{new Date(timestamp).toLocaleString()}</li>
              {/each}
            </ul>
          </section>
        {/if}

        <p class="ai-footnote">
          Labelling follows the HL7
          <a
            href="https://build.fhir.org/ig/HL7/aitransparency-ig/branches/main/en/index.html"
            target="_blank"
            rel="noopener noreferrer">AI Transparency on FHIR</a
          > implementation guide.
        </p>
      </div>
    </ModalBody>
  </Modal>
{/if}

<style>
  .ai-provenance {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    align-items: center;
    vertical-align: middle;
  }

  .ai-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    border: 1px solid var(--ai-border, #adb5bd);
    background: var(--ai-bg, #f8f9fa);
    color: var(--ai-fg, #495057);
    border-radius: 999px;
    padding: 0.05rem 0.5rem;
    font-size: 0.7rem;
    line-height: 1.4;
    white-space: nowrap;
    cursor: pointer;
  }

  .ai-pill:hover,
  .ai-pill:focus-visible {
    filter: brightness(0.96);
    text-decoration: underline;
  }

  .ai-pill-text {
    font-weight: 600;
  }

  .ai-pill-scope {
    opacity: 0.75;
    font-weight: 400;
  }

  .ai-pill-scope::before {
    content: '· ';
  }

  /* Degree of AI involvement */
  .ai-pill-generated {
    --ai-bg: #f3e8ff;
    --ai-border: #b47cf0;
    --ai-fg: #59209b;
  }
  .ai-pill-contributed {
    --ai-bg: #e7f1ff;
    --ai-border: #7aa7e8;
    --ai-fg: #1c4b91;
  }
  .ai-pill-reviewed,
  .ai-pill-asserted {
    --ai-bg: #eef0f2;
    --ai-border: #adb5bd;
    --ai-fg: #43494e;
  }

  /* Human review */
  .ai-pill-review-verified {
    --ai-bg: #e3f5e8;
    --ai-border: #6cbb83;
    --ai-fg: #1c6b36;
  }
  .ai-pill-review-involved {
    --ai-bg: #eef0f2;
    --ai-border: #adb5bd;
    --ai-fg: #43494e;
  }
  .ai-pill-review-none {
    --ai-bg: #fff4e0;
    --ai-border: #e0a54a;
    --ai-fg: #8a5300;
  }

  .ai-detail section {
    margin-bottom: 1.25rem;
  }

  .ai-heading {
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 0.7rem;
    color: #6c757d;
    margin-bottom: 0.35rem;
  }

  .ai-subheading {
    font-weight: 600;
    font-size: 0.85rem;
    margin: 0.75rem 0 0.25rem;
  }

  .ai-lead {
    margin-bottom: 0.25rem;
  }

  .ai-note {
    font-size: 0.85rem;
    color: #6c757d;
    margin-bottom: 0.25rem;
  }

  .ai-list {
    margin-bottom: 0.25rem;
    padding-left: 1.25rem;
    font-size: 0.9rem;
  }

  .ai-role {
    display: inline-block;
    background: #eef0f2;
    border-radius: 4px;
    padding: 0 0.35rem;
    margin-right: 0.35rem;
    font-size: 0.75rem;
    color: #43494e;
  }

  .ai-card {
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.5rem;
  }

  .ai-card-head {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: baseline;
    justify-content: space-between;
  }

  .ai-source {
    font-size: 0.75rem;
    color: #6c757d;
  }

  .ai-card-text {
    font-size: 0.9rem;
    margin: 0.35rem 0;
    white-space: pre-wrap;
  }

  .ai-card-pre {
    max-height: 16rem;
    overflow: auto;
    background: #f8f9fa;
    border-radius: 4px;
    padding: 0.5rem;
    font-size: 0.78rem;
    white-space: pre-wrap;
    margin-bottom: 0.35rem;
  }

  .ai-footnote {
    font-size: 0.75rem;
    color: #6c757d;
    margin-bottom: 0;
  }
</style>
