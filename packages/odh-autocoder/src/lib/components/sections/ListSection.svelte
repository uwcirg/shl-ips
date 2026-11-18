<script lang="ts">
  import { Button, Col, Icon, Row } from '@sveltestrap/sveltestrap';
  import type { ComponentType } from 'svelte';
  import { blankEntry, type OdhListSectionKey } from '../../fhir/values.js';
  import { getOdhFormContext } from '../../state/context.js';
  import { createOdhFormState } from '../../state/formState.js';

  // A list section: one entry form per entry, a Delete button for each, and an Add button.
  // Inside an OdhFormProvider it edits the provider's state and registers the section; outside
  // one it edits the entries bound to it.

  export let section: OdhListSectionKey;
  /** The section's entries, when not inside an OdhFormProvider */
  export let entries: any[] = [];
  /** Makes ids for added entries, when not inside an OdhFormProvider */
  export let createId: (() => string) | undefined = undefined;
  /** Component rendering one entry (props: bind:entry, idPrefix, and entryProps) */
  export let entryForm: ComponentType;
  /** More props for each entry form */
  export let entryProps: Record<string, unknown> = {};
  export let idPrefix: string;
  /** What an entry is called on the Add button, e.g. "past job" */
  export let noun: string;

  const context = getOdhFormContext();
  context?.register(section);
  // Outside a provider, a placeholder store that's never rendered
  const state = context?.state ?? createOdhFormState();

  function add() {
    if (context) {
      state.add(section);
    } else {
      entries = [...entries, blankEntry(section, { createId })];
    }
  }

  function remove(entry: any) {
    if (context) {
      state.remove(section, entry);
    } else {
      entries = entries.filter((e) => e !== entry);
    }
  }
</script>

{#if context}
  {#each $state[section] as entry, index (entry)}
    <svelte:component this={entryForm} bind:entry={entry} idPrefix={`${idPrefix}-${index}`} {...entryProps}>
      <svelte:fragment slot="actions">
        <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
          <Button outline color="danger" on:click={() => remove(entry)}>Delete</Button>
        </Col>
      </svelte:fragment>
    </svelte:component>
  {/each}
{:else}
  {#each entries as entry, index (entry)}
    <svelte:component this={entryForm} bind:entry={entry} idPrefix={`${idPrefix}-${index}`} {...entryProps}>
      <svelte:fragment slot="actions">
        <Col xs="auto" class="d-flex flex-grow-1 justify-content-end">
          <Button outline color="danger" on:click={() => remove(entry)}>Delete</Button>
        </Col>
      </svelte:fragment>
    </svelte:component>
  {/each}
{/if}
<Row>
  <Col>
    <Button color="secondary" outline on:click={add}>
      <Icon name="plus"/> Add {(context ? $state[section] : entries).length > 0 ? "another" : "a"} {noun}
    </Button>
  </Col>
</Row>
