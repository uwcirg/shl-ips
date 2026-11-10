<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import type { Observation } from 'fhir/r4';
  import { OdhForm } from 'odh-autocoder';
  import type { IAuthService, IResourceCollection, ResourceRetrieveEvent } from '$lib/utils/types';
  import { METHODS, CATEGORIES } from '$lib/config/tags';
  import { ResourceHelper } from '$lib/utils/ResourceHelper';

  // Adapts the odh-autocoder package's form to this app: reads the dataset being edited from
  // its resource store, authenticates autocoder requests with the user's token, and tags the
  // saved resources for the ODH data category.

  export let formData: IResourceCollection | undefined;
  export let processing: boolean = false;

  const authService: IAuthService = getContext('authService');

  let resourceStore;
  $: resourceStore = formData?.resources;
  let resources: Observation[] | undefined;
  $: resources = $resourceStore
    ? (Object.values($resourceStore) as ResourceHelper[]).map(rh => rh.resource as Observation)
    : undefined;

  const resourceDispatch = createEventDispatcher<{ 'update-resources': ResourceRetrieveEvent }>();
  const CATEGORY = CATEGORIES.OCCUPATIONAL_DATA_FOR_HEALTH;
  const METHOD = METHODS.OCCUPATIONAL_DATA_FOR_HEALTH_FORM;
  const SOURCE = {
    url: window.location.origin,
    name: 'My Work Info'
  };

  // The import pipeline replaces every resource's subject with the dataset's Patient
  // (assignPatientReference) and drops resources that have none (pruneUnlinkedEntries), so the
  // resources need a subject. This placeholder is the one the package's templates used to hold.
  const SUBJECT = { reference: 'Patient/98549f1a-e0d5-4454-849c-f5b97d3ed299' };

  function getAccessToken() {
    return authService.getAccessToken();
  }

  function save(resources: Observation[]) {
    let result: ResourceRetrieveEvent = {
      resources,
      category: CATEGORY,
      method: METHOD,
      source: SOURCE.url,
      sourceName: SOURCE.name
    };
    resourceDispatch('update-resources', result);
  }
</script>

<OdhForm
  {resources}
  {processing}
  endpoint="/api/nio-autocoder"
  {getAccessToken}
  subject={SUBJECT}
  onsave={save}
/>
