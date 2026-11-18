<script lang="ts">
  import type { Observation, Reference } from 'fhir/r4';
  import type { OdhSectionKey } from '../fhir/values.js';
  import { createOdhFormState } from '../state/formState.js';
  import { createOdhFormContext, setOdhFormContext } from '../state/context.js';
  import {
    DEFAULT_AUTOCODER_ENDPOINT,
    createAutocoderClient,
    setAutocoderClient
  } from '../autocoder/client.js';

  // The ODH form without a layout: owns the form's state and gives it, and an autocoder client,
  // to the sections inside. The app lays out the sections and its own Save and Clear controls,
  // using the slot props submit and reset. Only the sections in the layout are saved.

  /** Existing ODH resources to edit; undefined for a new form */
  export let resources: Observation[] | undefined = undefined;
  /** The id for the entry read from a resource (becomes the saved resource's id). Defaults to resource.id. */
  export let getId: ((resource: Observation) => string | undefined) | undefined = undefined;
  /** Makes an id for each new entry. Without it, new entries' resources have no id. */
  export let createId: (() => string) | undefined = undefined;
  /** Subject of the saved resources (e.g. the patient); they have none when not given */
  export let subject: Reference | undefined = undefined;
  /** Called with the ODH resources built from the form when submit is called */
  export let onsave: ((resources: Observation[]) => void) | undefined = undefined;
  /** Passed to the slot, for showing a busy state */
  export let processing: boolean = false;
  /** Sections to save. Defaults to the sections shown in the layout. */
  export let sections: OdhSectionKey[] | undefined = undefined;
  /** The app's autocoder endpoint (see createAutocoderHandler in odh-autocoder/server) */
  export let endpoint: string = DEFAULT_AUTOCODER_ENDPOINT;
  /** When set, autocoder requests carry an Authorization: Bearer header with its token */
  export let getAccessToken: (() => Promise<string | undefined>) | undefined = undefined;

  // The current getId and createId props, whenever the state reads or adds entries
  const idOptions = {
    getId: (resource: Observation) => (getId ? getId(resource) : resource.id),
    createId: () => createId!()
  };
  const state = createOdhFormState();
  const context = setOdhFormContext(createOdhFormContext(state));
  const { isWorking } = state;

  $: state.configure({ getId: idOptions.getId, createId: createId ? idOptions.createId : undefined });
  $: state.load(resources);

  // Context is set once, so the client reads the current endpoint and getAccessToken per request
  setAutocoderClient({
    code: (query, init) => createAutocoderClient({ endpoint, getAccessToken }).code(query, init)
  });

  /** Builds the resources and passes them to onsave */
  function submit() {
    onsave?.(state.toResources({ subject, sections: sections ?? context.registered() }));
  }

  /** Back to the resources being edited, or a new form */
  function reset() {
    state.reset();
  }
</script>

<slot values={$state} isWorking={$isWorking} {submit} {reset} {processing} {state} />
