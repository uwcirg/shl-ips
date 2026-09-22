import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { get, writable, derived, readable } from 'svelte/store';
import { fakeAuth } from '$lib/test/mocks';
import FHIRDataService from '$lib/utils/FHIRDataService';
import { ResourceCollection } from '$lib/utils/ResourceCollection';
import type { ResourceHelper } from '$lib/utils/ResourceHelper';
import { createCategorizedStore, type ResourceInput } from '$lib/stores/categorizedResources';
import { buildColorMap } from '$lib/utils/colors';
import { getFriendlySourceNames } from '$lib/utils/resourceCollectionUtils';
import { METHODS, CATEGORIES } from '$lib/config/tags';
import ManagePage from '../../routes/(common)/(app)/data/manage/+page.svelte';

// vi.mock factories are hoisted above this file's own top-level const declarations, so these
// must come from vi.hoisted() rather than plain consts (same TDZ issue documented in the
// other test files this session).
const {
  CATEGORY_SYSTEM,
  METHOD_SYSTEM,
  SOURCE_NAME_SYSTEM,
  PLACEHOLDER_SYSTEM,
  IDENTIFIER_SYSTEM,
  BASE
} = vi.hoisted(() => ({
  CATEGORY_SYSTEM: 'http://test.example.com/category',
  METHOD_SYSTEM: 'http://test.example.com/method',
  SOURCE_NAME_SYSTEM: 'http://test.example.com/source-name',
  PLACEHOLDER_SYSTEM: 'http://test.example.com/placeholder',
  IDENTIFIER_SYSTEM: 'http://keycloak.example.com',
  BASE: 'https://fhir.example.com'
}));

vi.mock('$lib/config/config', () => ({
  CATEGORY_SYSTEM,
  METHOD_SYSTEM,
  SOURCE_NAME_SYSTEM,
  PLACEHOLDER_SYSTEM,
  IDENTIFIER_SYSTEM,
  INTERMEDIATE_FHIR_SERVER_BASE: BASE
}));

// Empty sections neutralizes the "My Imports" tab's own dependency chain (INSTANCE_CONFIG
// sections, $app/stores, DataCategoryViewManage) regardless of whether sveltestrap's TabPane
// mounts inactive tab content eagerly or lazily — this test only exercises the default,
// active "My Health Data" tab.
vi.mock('$lib/config/instance_config', () => ({
  INSTANCE_CONFIG: { title: 'Test App', imgPath: '/img', pages: { data: { sections: [] } } }
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn()
}));

vi.mock('$app/stores', () => ({
  page: readable({ url: new URL('http://localhost/data/manage'), params: {}, route: { id: null } })
}));

function buildPatient() {
  return {
    resourceType: 'Patient',
    id: 'patient-1',
    meta: {
      source: 'test-clinic',
      // Tagged as a placeholder so it's excluded from the categorized resource list (the
      // same filter data/manage/+layout.svelte applies) — this test isn't verifying the
      // Patient resource-template's own rendering, only that the dataset shows up.
      tag: [
        { system: CATEGORY_SYSTEM, code: CATEGORIES.PROVIDER_HEALTH_RECORD },
        { system: METHOD_SYSTEM, code: METHODS.PROVIDER_HEALTH_RECORD_SOF },
        { system: SOURCE_NAME_SYSTEM, code: 'Test Clinic' },
        { system: PLACEHOLDER_SYSTEM, code: 'placeholder-patient' }
      ]
    }
  };
}

function buildObservation() {
  return {
    resourceType: 'Observation',
    id: 'obs-1',
    status: 'final',
    code: { text: 'Test Observation' },
    valueString: 'Recognizable test value',
    subject: {}
  };
}

// Mirrors what the real (app) layout and data/manage layout compute and hand down via
// context — colorMap in $lib/routes/(common)/(app)/+layout.svelte, categorizedStore in
// data/manage/+layout.svelte — since this test renders the page directly rather than through
// SvelteKit's router.
function buildManageContext(fhirDataService: FHIRDataService) {
  const collectionInfo = fhirDataService.getAllResourceCollections().map((c) => c.getTags());
  const friendlySourceNames = getFriendlySourceNames(collectionInfo);
  const colorMap = writable(buildColorMap(friendlySourceNames));

  const allResourceCollections = derived<typeof fhirDataService.userResources, ResourceCollection[]>(
    fhirDataService.userResources,
    () => fhirDataService.getAllResourceCollections()
  );
  const categorizerInput = derived(allResourceCollections, ($allResourceCollections: ResourceCollection[]) => {
    const input: ResourceInput = [];
    for (const rc of $allResourceCollections ?? []) {
      const { sourceName } = rc.getTags();
      const resources = (Object.values(get(rc.resources)) as ResourceHelper[]).filter(
        (rh) =>
          !(
            rh.resource.resourceType === 'Patient' &&
            (rh.resource as any)?.meta?.tag?.find((t: any) => t.system === PLACEHOLDER_SYSTEM)
          )
      );
      input.push({ source: sourceName, resources });
    }
    return input;
  });
  const categorizedStore = createCategorizedStore(categorizerInput);

  return new Map<string, unknown>([
    ['fhirDataService', fhirDataService],
    ['colorMap', colorMap],
    ['categorizedStore', categorizedStore],
    ['mode', writable('normal')]
  ]);
}

describe('/data/manage page', () => {
  it('shows the loaded source and its data once a dataset is in the FHIRDataService store', () => {
    const fhirDataService = new FHIRDataService(fakeAuth());
    const collection = new ResourceCollection([buildPatient(), buildObservation()] as any);
    fhirDataService.addDatasetToUserResources(collection);

    render(ManagePage, { context: buildManageContext(fhirDataService) });

    // SourceSummary: the dataset's source shows up as a pill.
    expect(screen.getByText('Test Clinic')).toBeInTheDocument();
    // DataSummary: the loaded Observation itself rendered through its real resource template.
    expect(screen.getByText('Test Observation')).toBeInTheDocument();
    expect(screen.getByText(/Recognizable test value/)).toBeInTheDocument();
  });

  it('shows no source pills when the store is empty', () => {
    const fhirDataService = new FHIRDataService(fakeAuth());

    render(ManagePage, { context: buildManageContext(fhirDataService) });

    expect(screen.queryByText('Test Clinic')).not.toBeInTheDocument();
  });
});
