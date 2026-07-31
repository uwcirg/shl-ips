<!-- src/routes/manage/+layout.svelte -->
<script lang="ts">
  import { getContext, setContext } from 'svelte';
  import { derived } from 'svelte/store';
  import { get } from 'svelte/store';
  import { PLACEHOLDER_SYSTEM } from '$lib/config/config';
  import FHIRDataService from '$lib/utils/FHIRDataService';
  import { createCategorizedStore, type ResourceInput } from '$lib/stores/categorizedResources';

  let fhirDataService: FHIRDataService = getContext('fhirDataService');
  let userResources = fhirDataService.userResources;

  const allResourceCollections = derived(
    userResources,
    () => fhirDataService.getAllResourceCollections()
  );

  const categorizerInput = derived(
    allResourceCollections,
    ($allResourceCollections) => {
      let input: ResourceInput = [];
      for (const rc of $allResourceCollections ?? []) {
        let { sourceName } = rc.getTags();
        const resources = Object.values(get(rc.resources)).filter(rh => 
          !(rh.resource.resourceType === 'Patient' && 
            rh.resource?.meta?.tag?.find(t => t.system === PLACEHOLDER_SYSTEM))
        );
        input.push({ source: sourceName, resources });
      }
      return input;
    }
  );

  const categorizedStore = createCategorizedStore(categorizerInput);
  setContext('categorizedStore', categorizedStore);
</script>

<slot />