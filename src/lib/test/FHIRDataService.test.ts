import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { get, writable } from 'svelte/store';
import { fakeAuth } from '$lib/test/mocks';
import {
  FHIRDataService,
  FHIRServiceError,
  MasterPatientWriteUncertainError
} from '$lib/utils/FHIRDataService';
import { StateManager } from '$lib/utils/StateManager';
import { ResourceCollection } from '$lib/utils/ResourceCollection';

const BASE = 'https://fhir.example.com';
const CATEGORY_SYSTEM = 'http://test.example.com/category';
const METHOD_SYSTEM = 'http://test.example.com/method';
const SOURCE_NAME_SYSTEM = 'http://test.example.com/source-name';
const PLACEHOLDER_SYSTEM = 'http://test.example.com/placeholder';

vi.mock('$lib/config/config', () => ({
  SOURCE_NAMESPACE: 'urn:test:source',
  INTERMEDIATE_FHIR_SERVER_BASE: BASE,
  IDENTIFIER_SYSTEM: 'http://keycloak.example.com',
  CATEGORY_SYSTEM,
  METHOD_SYSTEM,
  SOURCE_NAME_SYSTEM,
  PLACEHOLDER_SYSTEM
}));

const { uploadBundleEntriesMock, getPatientReferenceFromTransactionResponseMock } = vi.hoisted(() => ({
  uploadBundleEntriesMock: vi.fn(),
  getPatientReferenceFromTransactionResponseMock: vi.fn()
}));

vi.mock('$lib/utils/resourceUploader', () => ({
  uploadBundleEntries: uploadBundleEntriesMock,
  getPatientReferenceFromTransactionResponse: getPatientReferenceFromTransactionResponseMock
}));

function jsonResponse(body: unknown, opts: { ok?: boolean; status?: number; statusText?: string } = {}) {
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    statusText: opts.statusText ?? 'OK',
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
    json: vi.fn().mockResolvedValue(body)
  };
}

function taggedPatient(overrides: Record<string, unknown> = {}): any {
  return {
    resourceType: 'Patient',
    id: 'master-1',
    meta: { tag: [] },
    ...overrides
  };
}

function datasetPatient(
  id: string,
  category: string,
  method: string,
  source: string,
  sourceName?: string
): any {
  return {
    resourceType: 'Patient',
    id,
    meta: {
      source,
      lastUpdated: new Date().toISOString(),
      tag: [
        { system: CATEGORY_SYSTEM, code: category },
        { system: METHOD_SYSTEM, code: method },
        ...(sourceName ? [{ system: SOURCE_NAME_SYSTEM, code: sourceName }] : [])
      ]
    }
  };
}

describe('FHIRDataService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    uploadBundleEntriesMock.mockReset();
    getPatientReferenceFromTransactionResponseMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('starts empty with no master patient and no resources', () => {
      const service = new FHIRDataService(fakeAuth());

      expect(get(service.userResources)).toEqual({});
      expect(get(service.masterPatient)).toBeNull();
      expect(get(service.demographics)).toEqual({});
      expect(get(service.patientLinks)).toEqual([]);
      expect(get(service.loading)).toBe(false);
    });
  });

  describe('setMasterPatient', () => {
    it('wraps the patient, updates the store, and syncs demographics', () => {
      const service = new FHIRDataService(fakeAuth());
      const patient = taggedPatient({
        name: [{ given: ['Jane'], family: 'Doe' }],
        birthDate: '1990-01-01'
      });

      const helper = service.setMasterPatient(patient);

      expect(helper.resource).toEqual(patient);
      expect(get(service.masterPatient)).toBe(helper);
      expect(get(service.demographics)).toEqual({ first: 'Jane', last: 'Doe', dob: '1990-01-01' });
    });
  });

  describe('addDatasetToUserResources', () => {
    it('throws when the collection has no selected patient', () => {
      const service = new FHIRDataService(fakeAuth());

      expect(() => service.addDatasetToUserResources(new ResourceCollection())).toThrow(
        FHIRServiceError
      );
    });

    it('throws when the patient has no category tag', () => {
      const service = new FHIRDataService(fakeAuth());
      const collection = new ResourceCollection(taggedPatient({ meta: { tag: [] } }) as any);

      expect(() => service.addDatasetToUserResources(collection)).toThrow(/category/);
    });

    it('throws when the patient has no method tag', () => {
      const service = new FHIRDataService(fakeAuth());
      const patient = taggedPatient({ meta: { tag: [{ system: CATEGORY_SYSTEM, code: 'labs' }] } });
      const collection = new ResourceCollection(patient);

      expect(() => service.addDatasetToUserResources(collection)).toThrow(/method/);
    });

    it('throws when the patient has no source', () => {
      const service = new FHIRDataService(fakeAuth());
      const patient = taggedPatient({
        meta: {
          tag: [
            { system: CATEGORY_SYSTEM, code: 'labs' },
            { system: METHOD_SYSTEM, code: 'upload' }
          ]
        }
      });
      const collection = new ResourceCollection(patient);

      expect(() => service.addDatasetToUserResources(collection)).toThrow(/source/);
    });

    it('files the collection under category/method/source', () => {
      const service = new FHIRDataService(fakeAuth());
      const collection = new ResourceCollection(datasetPatient('ds-1', 'labs', 'upload', 'src-1'));

      const { status, collection: stored } = service.addDatasetToUserResources(collection);

      expect(stored).toBe(collection);
      expect(get(service.userResources).labs.upload['src-1'].collection).toBe(collection);
      expect(get(status)).toEqual({ state: StateManager.State.IDLE });
    });
  });

  describe('getAllResourceCollections / removeDatasetFromUserResources', () => {
    it('flattens all filed collections and can remove them again, cleaning up empty branches', () => {
      const service = new FHIRDataService(fakeAuth());
      const collection = new ResourceCollection(datasetPatient('ds-1', 'labs', 'upload', 'src-1'));
      service.addDatasetToUserResources(collection);

      expect(service.getAllResourceCollections()).toEqual([collection]);
      expect(service.datasetExists('labs', 'upload', 'src-1')).toBe(true);

      service.removeDatasetFromUserResources('labs', 'upload', 'src-1');

      expect(service.getAllResourceCollections()).toEqual([]);
      expect(service.datasetExists('labs', 'upload', 'src-1')).toBe(false);
      expect(get(service.userResources)).toEqual({});
    });
  });

  describe('getDatasetsForCategory / getDatasetsForCategoryAndMethod', () => {
    it('returns datasets sorted newest-first and scoped to category/method', () => {
      const service = new FHIRDataService(fakeAuth());
      const older = new ResourceCollection(datasetPatient('ds-old', 'labs', 'upload', 'src-old'));
      (get(older.patient) as any).meta.lastUpdated = '2020-01-01T00:00:00Z';
      const newer = new ResourceCollection(datasetPatient('ds-new', 'labs', 'upload', 'src-new'));
      (get(newer.patient) as any).meta.lastUpdated = '2024-01-01T00:00:00Z';
      const otherMethod = new ResourceCollection(datasetPatient('ds-other', 'labs', 'manual', 'src-manual'));
      (get(otherMethod.patient) as any).meta.lastUpdated = '2022-01-01T00:00:00Z';

      service.addDatasetToUserResources(older);
      service.addDatasetToUserResources(newer);
      service.addDatasetToUserResources(otherMethod);

      const byCategory = service.getDatasetsForCategory('labs');
      expect(byCategory.map(d => d.collection)).toEqual([newer, otherMethod, older]);

      const byCategoryAndMethod = service.getDatasetsForCategoryAndMethod('labs', 'upload');
      expect(byCategoryAndMethod).toHaveLength(2);
      expect(byCategoryAndMethod[0].collection).toBe(newer);
      expect(byCategoryAndMethod[1].collection).toBe(older);

      expect(service.getDatasetsForCategory('imaging')).toEqual([]);
      expect(service.getDatasetsForCategoryAndMethod('labs', 'nonexistent')).toEqual([]);
    });
  });

  describe('addLinkToMasterPatient', () => {
    it('returns a clone of the master patient with the new link appended, without mutating the original', () => {
      const service = new FHIRDataService(fakeAuth());
      const patient = taggedPatient({ link: [{ other: { reference: 'Patient/existing' }, type: 'seealso' }] });
      service.setMasterPatient(patient);

      const updated = service.addLinkToMasterPatient('Patient/new-dataset');

      expect(updated.link).toEqual([
        { other: { reference: 'Patient/existing' }, type: 'seealso' },
        { other: { reference: 'Patient/new-dataset' }, type: 'seealso' }
      ]);
      expect(get(service.masterPatient).resource.link).toEqual([
        { other: { reference: 'Patient/existing' }, type: 'seealso' }
      ]);
    });
  });

  describe('generateMasterPatientFromAuth', () => {
    it('builds a patient resource from the auth profile', () => {
      const auth = fakeAuth({
        user: writable({
          profile: {
            sub: 'user-42',
            given_name: 'Jane',
            family_name: 'Doe',
            email: 'jane@example.com',
            gender: 'FEMALE',
            birthday: '1990-01-01'
          }
        }) as any
      });
      const service = new FHIRDataService(auth);

      const patient = service.generateMasterPatientFromAuth() as any;

      expect(patient.name[0]).toEqual({ given: ['Jane'], family: 'Doe' });
      expect(patient.birthDate).toBe('1990-01-01');
      expect(patient.gender).toBe('female');
      expect(patient.identifier).toContainEqual({
        system: 'http://keycloak.example.com',
        value: 'user-42'
      });
    });
  });

  describe('fetchAuthUserPatient', () => {
    it('fetches by identifier and sets the master patient when found', async () => {
      const service = new FHIRDataService(fakeAuth());
      const patient = taggedPatient();
      fetchMock.mockResolvedValueOnce(jsonResponse({ total: 1, entry: [{ resource: patient }] }));

      const result = await service.fetchAuthUserPatient();

      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/Patient?identifier=http://keycloak.example.com%7Cuser-1`,
        expect.objectContaining({ cache: 'no-cache' })
      );
      expect(result?.resource).toEqual(patient);
      expect(get(service.masterPatient)).toBe(result);
    });

    it('returns undefined and leaves the master patient unset when nothing is found', async () => {
      const service = new FHIRDataService(fakeAuth());
      fetchMock.mockResolvedValueOnce(jsonResponse({ total: 0 }));

      const result = await service.fetchAuthUserPatient();

      expect(result).toBeUndefined();
      expect(get(service.masterPatient)).toBeNull();
    });

    it('wraps a read failure in a FHIRServiceError', async () => {
      const service = new FHIRDataService(fakeAuth());
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockRejectedValue(new Error('connection dropped'))
      });

      await expect(service.fetchAuthUserPatient()).rejects.toBeInstanceOf(FHIRServiceError);
    });
  });

  describe('getOrCreateMasterPatient', () => {
    it('returns the cached master patient without hitting the network', async () => {
      const service = new FHIRDataService(fakeAuth());
      const helper = service.setMasterPatient(taggedPatient());

      const result = await service.getOrCreateMasterPatient();

      expect(result).toBe(helper);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('uses the server-fetched patient when one exists', async () => {
      const service = new FHIRDataService(fakeAuth());
      const patient = taggedPatient();
      fetchMock.mockResolvedValueOnce(jsonResponse({ total: 1, entry: [{ resource: patient }] }));

      const result = await service.getOrCreateMasterPatient();

      expect(result.resource).toEqual(patient);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('creates a new master patient from the auth profile when none exists on the server', async () => {
      const auth = fakeAuth({
        user: writable({
          profile: { sub: 'user-42', given_name: 'Jane', family_name: 'Doe' }
        }) as any
      });
      const service = new FHIRDataService(auth);
      const savedPatient = { resourceType: 'Patient', id: 'new-id', name: [{ given: ['Jane'], family: 'Doe' }] };
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ total: 0 }))
        .mockResolvedValueOnce(jsonResponse(savedPatient));

      const result = await service.getOrCreateMasterPatient();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toBe(`${BASE}/Patient`);
      expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST' });
      expect(result.resource).toEqual(savedPatient);
    });
  });

  describe('createOrUpdateMasterPatient', () => {
    it('PUTs to the existing patient id when the master patient already has one', async () => {
      const service = new FHIRDataService(fakeAuth());
      service.setMasterPatient(taggedPatient({ id: 'master-1' }));
      const savedPatient = taggedPatient({ id: 'master-1', birthDate: '2000-01-01' });
      fetchMock.mockResolvedValueOnce(jsonResponse(savedPatient));

      const result = await service.createOrUpdateMasterPatient({ resourceType: 'Patient', birthDate: '2000-01-01' } as any);

      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/Patient/master-1`,
        expect.objectContaining({ method: 'PUT' })
      );
      const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
      expect(sentBody.id).toBe('master-1');
      expect(result.resource).toEqual(savedPatient);
    });

    it('throws MasterPatientWriteUncertainError when the request never gets a response', async () => {
      const service = new FHIRDataService(fakeAuth());
      service.setMasterPatient(taggedPatient({ id: 'master-1' }));
      const networkError = new Error('offline');
      fetchMock.mockRejectedValueOnce(networkError);

      const error = await service
        .createOrUpdateMasterPatient({ resourceType: 'Patient' } as any)
        .catch(e => e);

      expect(error).toBeInstanceOf(MasterPatientWriteUncertainError);
      expect(error.cause).toBe(networkError);
    });

    it('throws a plain FHIRServiceError when the server rejects the write', async () => {
      const service = new FHIRDataService(fakeAuth());
      service.setMasterPatient(taggedPatient({ id: 'master-1' }));
      fetchMock.mockResolvedValueOnce({
        ok: false,
        text: vi.fn().mockResolvedValue('{"issue": "bad request"}')
      });

      const error = await service
        .createOrUpdateMasterPatient({ resourceType: 'Patient' } as any)
        .catch(e => e);

      expect(error).toBeInstanceOf(FHIRServiceError);
      expect(error).not.toBeInstanceOf(MasterPatientWriteUncertainError);
    });

    it('throws MasterPatientWriteUncertainError when the confirmed write cannot be parsed', async () => {
      const service = new FHIRDataService(fakeAuth());
      service.setMasterPatient(taggedPatient({ id: 'master-1' }));
      fetchMock.mockResolvedValueOnce({
        ok: true,
        text: vi.fn().mockResolvedValue('not json')
      });

      const error = await service
        .createOrUpdateMasterPatient({ resourceType: 'Patient' } as any)
        .catch(e => e);

      expect(error).toBeInstanceOf(MasterPatientWriteUncertainError);
    });
  });

  describe('fetchDatasetFromPatientReference', () => {
    it('fetches $everything and strips out a duplicate of the master patient', async () => {
      const service = new FHIRDataService(fakeAuth());
      service.setMasterPatient(taggedPatient({ id: 'master-1' }));
      const observation = { resourceType: 'Observation', id: 'obs-1' };
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ entry: [{ resource: taggedPatient({ id: 'master-1' }) }, { resource: observation }] })
      );

      const collection = await service.fetchDatasetFromPatientReference('Patient/ds-1');

      expect(fetchMock).toHaveBeenCalledWith(
        `${BASE}/Patient/ds-1/$everything?_count=1000`,
        expect.objectContaining({ cache: 'no-store' })
      );
      expect(collection.getFHIRResources()).toEqual([observation]);
    });

    it('returns an empty collection when the bundle has no entries', async () => {
      const service = new FHIRDataService(fakeAuth());
      service.setMasterPatient(taggedPatient({ id: 'master-1' }));
      fetchMock.mockResolvedValueOnce(jsonResponse({}));

      const collection = await service.fetchDatasetFromPatientReference('Patient/ds-1');

      expect(collection.getFHIRResources()).toEqual([]);
    });
  });

  describe('createDatasetOnServer', () => {
    it('returns the patient reference from a successful transaction', async () => {
      const service = new FHIRDataService(fakeAuth());
      const transactionResponse = { resourceType: 'Bundle', entry: [] };
      uploadBundleEntriesMock.mockResolvedValue(transactionResponse);
      getPatientReferenceFromTransactionResponseMock.mockResolvedValue('Patient/new-1');

      const result = await service.createDatasetOnServer([] as any);

      expect(result).toBe('Patient/new-1');
      expect(uploadBundleEntriesMock).toHaveBeenCalledWith([], 'access-token-1');
    });

    it('throws when the server returns an OperationOutcome', async () => {
      const service = new FHIRDataService(fakeAuth());
      uploadBundleEntriesMock.mockResolvedValue({ resourceType: 'OperationOutcome', issue: [{ diagnostics: 'bad' }] });

      await expect(service.createDatasetOnServer([] as any)).rejects.toBeInstanceOf(FHIRServiceError);
    });
  });

  describe('deleteDatasetFromServer / deleteDataset', () => {
    function setUpDataset(service: FHIRDataService) {
      const masterPatient = taggedPatient({
        id: 'master-1',
        link: [{ other: { reference: 'Patient/ds-1' }, type: 'seealso' }]
      });
      service.setMasterPatient(masterPatient);
      const collection = new ResourceCollection(datasetPatient('ds-1', 'labs', 'upload', 'src-1'));
      service.addDatasetToUserResources(collection);
      return collection;
    }

    it('does nothing when the dataset does not exist', async () => {
      const service = new FHIRDataService(fakeAuth());
      await expect(service.deleteDatasetFromServer('labs', 'upload', 'missing')).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refuses to delete a dataset that is currently loading', async () => {
      const service = new FHIRDataService(fakeAuth());
      setUpDataset(service);
      const dataset = get(service.userResources).labs.upload['src-1'];
      dataset.status.set({ state: StateManager.State.LOADING });

      await expect(service.deleteDatasetFromServer('labs', 'upload', 'src-1')).rejects.toThrow(/loading/);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('throws when the master patient has no linked datasets', async () => {
      const service = new FHIRDataService(fakeAuth());
      service.setMasterPatient(taggedPatient({ id: 'master-1' }));
      const collection = new ResourceCollection(datasetPatient('ds-1', 'labs', 'upload', 'src-1'));
      service.addDatasetToUserResources(collection);

      await expect(service.deleteDatasetFromServer('labs', 'upload', 'src-1')).rejects.toThrow(/no linked datasets/);
    });

    it('throws when the dataset is not among the master patient links', async () => {
      const service = new FHIRDataService(fakeAuth());
      service.setMasterPatient(
        taggedPatient({ id: 'master-1', link: [{ other: { reference: 'Patient/someone-else' }, type: 'seealso' }] })
      );
      const collection = new ResourceCollection(datasetPatient('ds-1', 'labs', 'upload', 'src-1'));
      service.addDatasetToUserResources(collection);

      await expect(service.deleteDatasetFromServer('labs', 'upload', 'src-1')).rejects.toThrow(/does not exist in patient records/);
    });

    it('removes the link from the master patient then cascade-deletes the dataset', async () => {
      const service = new FHIRDataService(fakeAuth());
      setUpDataset(service);
      const updatedMasterPatient = taggedPatient({ id: 'master-1' });
      fetchMock
        .mockResolvedValueOnce(jsonResponse(updatedMasterPatient)) // PUT master patient (link removed)
        .mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValue('') }); // DELETE dataset

      await service.deleteDatasetFromServer('labs', 'upload', 'src-1');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/Patient/master-1`);
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT' });
      expect(fetchMock.mock.calls[1][0]).toBe(`${BASE}/Patient/ds-1?_cascade=delete`);
      expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'DELETE' });
    });

    it('wraps a failed cascade delete in a FHIRServiceError', async () => {
      const service = new FHIRDataService(fakeAuth());
      setUpDataset(service);
      fetchMock
        .mockResolvedValueOnce(jsonResponse(taggedPatient({ id: 'master-1' })))
        .mockResolvedValueOnce({ ok: false, text: vi.fn().mockResolvedValue('server error') });

      await expect(service.deleteDatasetFromServer('labs', 'upload', 'src-1')).rejects.toBeInstanceOf(FHIRServiceError);
    });

    it('deleteDataset removes the local entry only after a successful server delete', async () => {
      const service = new FHIRDataService(fakeAuth());
      setUpDataset(service);
      fetchMock
        .mockResolvedValueOnce(jsonResponse(taggedPatient({ id: 'master-1' })))
        .mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValue('') });

      await service.deleteDataset('labs', 'upload', 'src-1');

      expect(service.datasetExists('labs', 'upload', 'src-1')).toBe(false);
    });

    it('deleteDataset leaves the local entry in place and rethrows when the server delete fails', async () => {
      const service = new FHIRDataService(fakeAuth());
      setUpDataset(service);
      fetchMock
        .mockResolvedValueOnce(jsonResponse(taggedPatient({ id: 'master-1' })))
        .mockResolvedValueOnce({ ok: false, text: vi.fn().mockResolvedValue('server error') });

      await expect(service.deleteDataset('labs', 'upload', 'src-1')).rejects.toBeInstanceOf(FHIRServiceError);
      expect(service.datasetExists('labs', 'upload', 'src-1')).toBe(true);
    });
  });

  describe('addOrReplaceDataset', () => {
    function transactionResponseFor(patientReference: string) {
      return { resourceType: 'Bundle', entry: [{ response: { location: `${patientReference}/_history/1` } }] };
    }

    it('normalizes, uploads, links, and pulls back a brand-new dataset', async () => {
      const service = new FHIRDataService(fakeAuth());
      service.setMasterPatient(taggedPatient({ id: 'master-1' }));

      uploadBundleEntriesMock.mockResolvedValue(transactionResponseFor('Patient/new-1'));
      getPatientReferenceFromTransactionResponseMock.mockResolvedValue('Patient/new-1');

      // The $everything pull-back returns the dataset's own patient (a different id
      // than the master patient) alongside the uploaded observation.
      const datasetPatientResource = datasetPatient('new-1', 'labs', 'upload', 'src-1', 'Src One');
      const finalObservation = { resourceType: 'Observation', id: 'obs-1' };
      fetchMock
        .mockResolvedValueOnce(jsonResponse(taggedPatient({ id: 'master-1', link: [{ other: { reference: 'Patient/new-1' }, type: 'seealso' }] }))) // link PUT
        .mockResolvedValueOnce(
          jsonResponse({ entry: [{ resource: datasetPatientResource }, { resource: finalObservation }] })
        ); // $everything pull-back

      await service.addOrReplaceDataset({
        resources: [{ resourceType: 'Observation', id: 'obs-1' } as any],
        category: 'labs',
        method: 'upload',
        source: 'src-1',
        sourceName: 'Src One'
      });

      expect(uploadBundleEntriesMock).toHaveBeenCalledTimes(1);
      const uploadedEntries = uploadBundleEntriesMock.mock.calls[0][0];
      expect(uploadedEntries.every((e: any) => e.fullUrl?.startsWith('urn:uuid:'))).toBe(true);

      const dataset = get(service.userResources).labs.upload['src-1'];
      expect(get(dataset.status)).toEqual({ state: StateManager.State.IDLE });
      expect(dataset.collection.getFHIRResources().map((r: any) => r.resourceType).sort()).toEqual([
        'Observation',
        'Patient'
      ]);
    });

    it('marks the optimistic dataset as errored (without removing it) when the upload fails', async () => {
      const service = new FHIRDataService(fakeAuth());
      service.setMasterPatient(taggedPatient({ id: 'master-1' }));
      uploadBundleEntriesMock.mockResolvedValue({ resourceType: 'OperationOutcome', issue: [] });

      await expect(
        service.addOrReplaceDataset({
          resources: [{ resourceType: 'Observation', id: 'obs-1' } as any],
          category: 'labs',
          method: 'upload',
          source: 'src-1',
          sourceName: 'Src One'
        })
      ).rejects.toBeInstanceOf(FHIRServiceError);

      const dataset = get(service.userResources).labs?.upload?.['src-1'];
      expect(dataset).toBeDefined();
      expect(get(dataset.status)).toEqual(expect.objectContaining({ state: StateManager.State.ERROR }));
    });

    it('rolls back the created dataset when linking it to the master patient fails', async () => {
      const service = new FHIRDataService(fakeAuth());
      service.setMasterPatient(taggedPatient({ id: 'master-1' }));

      uploadBundleEntriesMock.mockResolvedValue(transactionResponseFor('Patient/new-1'));
      getPatientReferenceFromTransactionResponseMock.mockResolvedValue('Patient/new-1');

      fetchMock
        .mockRejectedValueOnce(new Error('link PUT failed')) // createOrUpdateMasterPatient (add link)
        .mockResolvedValueOnce(jsonResponse(taggedPatient({ id: 'master-1' }))) // removeLinkFromMasterPatient PUT
        .mockResolvedValueOnce({ ok: true, text: vi.fn().mockResolvedValue('') }); // cascade delete of Patient/new-1

      await expect(
        service.addOrReplaceDataset({
          resources: [{ resourceType: 'Observation', id: 'obs-1' } as any],
          category: 'labs',
          method: 'upload',
          source: 'src-1',
          sourceName: 'Src One'
        })
      ).rejects.toBeInstanceOf(FHIRServiceError);

      expect(service.datasetExists('labs', 'upload', 'src-1')).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[2][0]).toBe(`${BASE}/Patient/new-1?_cascade=delete`);
      expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: 'DELETE' });
    });

    it('aborts the cascade delete when the link removal itself cannot be confirmed', async () => {
      const service = new FHIRDataService(fakeAuth());
      service.setMasterPatient(taggedPatient({ id: 'master-1' }));

      uploadBundleEntriesMock.mockResolvedValue(transactionResponseFor('Patient/new-1'));
      getPatientReferenceFromTransactionResponseMock.mockResolvedValue('Patient/new-1');

      fetchMock
        .mockRejectedValueOnce(new Error('link PUT failed')) // createOrUpdateMasterPatient (add link)
        .mockRejectedValueOnce(new Error('link removal PUT also failed')); // removeLinkFromMasterPatient PUT

      await expect(
        service.addOrReplaceDataset({
          resources: [{ resourceType: 'Observation', id: 'obs-1' } as any],
          category: 'labs',
          method: 'upload',
          source: 'src-1',
          sourceName: 'Src One'
        })
      ).rejects.toBeInstanceOf(FHIRServiceError);

      // Only the two link-write attempts happened — no cascade-delete fetch, since we
      // can't confirm whether the master patient actually references Patient/new-1.
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
