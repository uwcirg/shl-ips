import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Pin the timezone before any Date work runs below. Several functions under test
// (deriveDateFromAge in particular) parse a bare "YYYY-MM-DD" string with `new Date(...)`,
// which the spec parses as UTC, then read/modify it with local-time Date methods — a classic
// UTC/local mismatch that shifts the result by a day in any timezone behind UTC. Running
// these tests under UTC removes that offset so they aren't tied to the runner's local zone.
process.env.TZ = 'UTC';

import {
  copyOf,
  getUniqueResourceObject,
  handlePartialISODate,
  normalizeDateString,
  formatDate,
  hasChoiceDTField,
  choiceDTFields,
  getFHIRDateAndPrecision,
  getEntry,
  getReferences,
  assignPatientReference,
  isIPSBundle,
  getEntriesFromIPS,
  isSHCFile,
  isValidUrl,
  clearURLOfParams,
  getDemographicsFromPatient,
  constructPatientResource,
  buildPatientSearchQuery,
  fetchEverything,
  download,
  randomStringWithEntropy
} from '$lib/utils/util';

// Formats using local date components (not toISOString, which converts to UTC and
// can shift the calendar day depending on the test runner's timezone).
function localYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('randomStringWithEntropy', () => {
  it('returns a base64url string with no padding characters', () => {
    const result = randomStringWithEntropy(16);
    expect(typeof result).toBe('string');
    expect(result).not.toMatch(/[+/=]/);
  });
});

describe('copyOf', () => {
  it('deep clones so mutating the copy leaves the original untouched', () => {
    const original = { a: 1, nested: { b: 2 } };
    const copy = copyOf(original);
    copy.nested.b = 999;

    expect(copy).toEqual({ a: 1, nested: { b: 999 } });
    expect(original.nested.b).toBe(2);
  });
});

describe('getUniqueResourceObject', () => {
  it('clones the resource and assigns a fresh id', () => {
    const template = { resourceType: 'Patient', id: 'template-id' };
    const result = getUniqueResourceObject(template as any);

    expect(result.resourceType).toBe('Patient');
    expect(result.id).not.toBe('template-id');
    expect(typeof result.id).toBe('string');
    expect(template.id).toBe('template-id');
  });
});

describe('handlePartialISODate', () => {
  it('returns null for an empty date', () => {
    expect(handlePartialISODate(undefined)).toBeNull();
    expect(handlePartialISODate('')).toBeNull();
  });

  it('returns null for a non-ISO string', () => {
    expect(handlePartialISODate('not a date')).toBeNull();
  });

  it('detects full datetime precision', () => {
    const result = handlePartialISODate('2023-05-10T14:30:00');
    expect(result?.precision).toBe(4);
  });

  it('detects day precision', () => {
    const result = handlePartialISODate('2023-05-10');
    expect(result?.precision).toBe(3);
  });

  it('detects month precision', () => {
    const result = handlePartialISODate('2023-05');
    expect(result?.precision).toBe(2);
  });

  it('detects year precision', () => {
    const result = handlePartialISODate('2023');
    expect(result?.precision).toBe(1);
  });

  it('returns null for a well-formed but invalid calendar date', () => {
    expect(handlePartialISODate('2023-02-30')).toBeNull();
  });
});

describe('normalizeDateString', () => {
  it('delegates to handlePartialISODate for ISO strings', () => {
    const result = normalizeDateString('2023-05');
    expect(result?.precision).toBe(2);
  });

  it('falls back to Date parsing for a non-ISO but parseable string, always at year precision', () => {
    const result = normalizeDateString('May 10, 2023');
    expect(result).not.toBeNull();
    expect(result?.precision).toBe(1);
  });

  it('returns null for unparseable input', () => {
    expect(normalizeDateString('not a real date at all')).toBeNull();
  });

  it('returns null for empty input', () => {
    expect(normalizeDateString(undefined)).toBeNull();
  });
});

describe('formatDate', () => {
  it('returns "??" when no date is given', () => {
    expect(formatDate(undefined)).toBe('??');
  });

  it('formats a day-precision date', () => {
    expect(formatDate('2023-05-10')).toBe('10 May 2023');
  });

  it('formats a month-precision date', () => {
    expect(formatDate('2023-05')).toBe('May 2023');
  });

  it('formats a year-precision date', () => {
    expect(formatDate('2023')).toBe('2023');
  });

  it('returns the raw string when it cannot be parsed', () => {
    expect(formatDate('garbage-date')).toBe('garbage-date');
  });
});

describe('hasChoiceDTField / choiceDTFields', () => {
  it('detects and extracts a FHIR choice-type field by its prefix', () => {
    const resource = { onsetDateTime: '2020-01-01' } as any;
    expect(hasChoiceDTField('onset', resource)).toBe(true);
    expect(choiceDTFields('onset', resource)).toEqual({ dateTime: '2020-01-01' });
  });

  it('returns null when no field matches the prefix', () => {
    const resource = { status: 'final' } as any;
    expect(hasChoiceDTField('onset', resource)).toBe(false);
    expect(choiceDTFields('onset', resource)).toBeNull();
  });

  it('classifies an exact-key string value as "string"', () => {
    const resource = { onset: '2020-01-01' } as any;
    expect(choiceDTFields('onset', resource)).toEqual({ string: '2020-01-01' });
  });

  it('classifies an exact-key Period-shaped value as "period"', () => {
    const resource = { onset: { start: '2020-01-01', end: '2020-02-01' } } as any;
    expect(choiceDTFields('onset', resource)).toEqual({
      period: { start: '2020-01-01', end: '2020-02-01' }
    });
  });

  it('classifies an exact-key Age-shaped value (unit "a") as "age"', () => {
    const resource = { onset: { value: 5, unit: 'a' } } as any;
    expect(choiceDTFields('onset', resource)).toEqual({ age: { value: 5, unit: 'a' } });
  });

  it('returns an empty object when the value matches no recognized shape', () => {
    const resource = { onset: { somethingElse: true } } as any;
    expect(choiceDTFields('onset', resource)).toEqual({});
  });
});

describe('getFHIRDateAndPrecision', () => {
  it('resolves a plain dateTime choice field', () => {
    const result = getFHIRDateAndPrecision({ onsetDateTime: '2020-01-01' } as any, 'onset');
    expect(result?.precision).toBe(3);
    expect(result?.date && localYMD(result.date)).toBe('2020-01-01');
  });

  it('resolves a Period via its start', () => {
    const result = getFHIRDateAndPrecision(
      { onsetPeriod: { start: '2020-01-01', end: '2020-02-01' } } as any,
      'onset'
    );
    expect(result?.date && localYMD(result.date)).toBe('2020-01-01');
  });

  it('resolves an Age when the patient birth date is known', () => {
    const result = getFHIRDateAndPrecision(
      { onsetAge: { value: 5, unit: 'years' } } as any,
      'onset',
      '2000-01-01'
    );
    expect(result?.date && localYMD(result.date)).toBe('2005-01-01');
    expect(result?.precision).toBe(1);
  });

  it('returns null for an Age when no patient birth date is available', () => {
    const result = getFHIRDateAndPrecision({ onsetAge: { value: 5, unit: 'years' } } as any, 'onset');
    expect(result).toBeNull();
  });

  it('returns null when no choice field matches the prefix', () => {
    expect(getFHIRDateAndPrecision({ status: 'final' } as any, 'onset')).toBeNull();
  });

  it('resolves a Period via its end date when no start is given', () => {
    const result = getFHIRDateAndPrecision({ onsetPeriod: { end: '2020-02-01' } } as any, 'onset');
    expect(result?.date && localYMD(result.date)).toBe('2020-02-01');
  });
});

describe('getEntry', () => {
  it('matches by fullUrl containing the reference', () => {
    const entries = [{ fullUrl: 'urn:uuid:123', resource: { resourceType: 'Patient', id: '123' } }] as any;
    expect(getEntry(entries, 'urn:uuid:123')).toEqual({ resourceType: 'Patient', id: '123' });
  });

  it('falls back to matching the trailing id segment of the reference', () => {
    const entries = [{ resource: { resourceType: 'Observation', id: 'abc-123' } }] as any;
    expect(getEntry(entries, 'Observation/abc-123')).toEqual({ resourceType: 'Observation', id: 'abc-123' });
  });

  it('returns undefined when there are no entries', () => {
    expect(getEntry(undefined as any, 'Patient/1')).toBeUndefined();
  });

  it('returns undefined when nothing matches', () => {
    const entries = [{ resource: { resourceType: 'Observation', id: 'zzz' } }] as any;
    expect(getEntry(entries, 'Observation/does-not-exist')).toBeUndefined();
  });
});

describe('getReferences', () => {
  it('collects nested "reference" fields, skipping subject/patient entirely', () => {
    const resource = {
      resourceType: 'Observation',
      subject: { reference: 'Patient/should-be-skipped' },
      performer: [{ actor: { reference: 'Practitioner/p1' } }],
      derivedFrom: [{ reference: 'Observation/o1' }, { reference: 'Observation/o2' }]
    };

    const refs = getReferences(resource);

    expect(refs.sort()).toEqual(['Observation/o1', 'Observation/o2', 'Practitioner/p1'].sort());
  });

  it('returns an empty array when there are no references', () => {
    expect(getReferences({ resourceType: 'Patient' })).toEqual([]);
  });
});

describe('assignPatientReference', () => {
  it('overwrites every patient-linked field present on the resource', () => {
    const resource: any = {
      resourceType: 'Coverage',
      subject: { reference: 'Patient/old' },
      beneficiary: { reference: 'Patient/old' },
      unrelatedField: { reference: 'Patient/should-not-change' }
    };

    assignPatientReference(resource, 'Patient/new');

    expect(resource.subject).toEqual({ reference: 'Patient/new' });
    expect(resource.beneficiary).toEqual({ reference: 'Patient/new' });
    expect(resource.unrelatedField).toEqual({ reference: 'Patient/should-not-change' });
  });
});

describe('isIPSBundle', () => {
  function ipsBundle(overrides: Record<string, unknown> = {}) {
    return {
      resourceType: 'Bundle',
      type: 'document',
      entry: [
        {
          resource: {
            resourceType: 'Composition',
            type: { coding: [{ system: 'http://loinc.org', code: '60591-5' }] }
          }
        }
      ],
      ...overrides
    };
  }

  it('recognizes a valid IPS bundle', () => {
    expect(isIPSBundle(ipsBundle() as any)).toBe(true);
  });

  it('rejects a bundle that is not type "document"', () => {
    expect(isIPSBundle(ipsBundle({ type: 'collection' }) as any)).toBe(false);
  });

  it('rejects a composition with the wrong code', () => {
    const bundle = ipsBundle({
      entry: [{ resource: { resourceType: 'Composition', type: { coding: [{ system: 'http://loinc.org', code: 'wrong' }] } } }]
    });
    expect(isIPSBundle(bundle as any)).toBe(false);
  });

  it('returns false, without throwing, for undefined input', () => {
    expect(isIPSBundle(undefined as any)).toBe(false);
  });

  it('returns false, without throwing, when the bundle has no entry array at all', () => {
    expect(isIPSBundle({ resourceType: 'Bundle', type: 'document' } as any)).toBe(false);
  });

  it('returns false, without throwing, when entries exist but none is a Composition', () => {
    const bundle = { resourceType: 'Bundle', type: 'document', entry: [{ resource: { resourceType: 'Observation' } }] };
    expect(isIPSBundle(bundle as any)).toBe(false);
  });
});

describe('getEntriesFromIPS', () => {
  it('drops the Composition, absent-unknown entries, and narrativeLink extensions', () => {
    const ips = {
      resourceType: 'Bundle',
      type: 'document',
      entry: [
        { resource: { resourceType: 'Composition', id: 'comp-1' } },
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-1',
            valueCodeableConcept: { coding: [{ system: 'http://hl7.org/fhir/uv/ips/CodeSystem/absent-unknown-uv-ips' }] }
          }
        },
        {
          resource: {
            resourceType: 'Observation',
            id: 'obs-2',
            extension: [
              { url: 'http://hl7.org/fhir/StructureDefinition/narrativeLink', valueString: 'x' },
              { url: 'http://example.org/keep-me', valueString: 'y' }
            ]
          }
        }
      ]
    };

    const result = getEntriesFromIPS(ips as any);

    expect(result).toHaveLength(1);
    expect(result?.[0].id).toBe('obs-2');
    expect((result?.[0] as any).extension).toEqual([{ url: 'http://example.org/keep-me', valueString: 'y' }]);
  });

  it('returns undefined when there is no entry array', () => {
    expect(getEntriesFromIPS({ resourceType: 'Bundle', type: 'document' } as any)).toBeUndefined();
  });
});

describe('isSHCFile', () => {
  it('is true only when verifiableCredential is present', () => {
    expect(isSHCFile({ verifiableCredential: ['abc'] })).toBe(true);
    expect(isSHCFile({ resourceType: 'Bundle' })).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('accepts well-formed URLs and rejects everything else', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('not a url')).toBe(false);
  });
});

describe('clearURLOfParams', () => {
  it('keeps only the shlid param', () => {
    const url = new URL('https://example.com/page?shlid=abc123&other=drop-me');

    const result = clearURLOfParams(url);

    expect(result.search).toBe('?shlid=abc123');
  });

  it('clears the query entirely when shlid is absent', () => {
    const url = new URL('https://example.com/page?other=drop-me');

    const result = clearURLOfParams(url);

    expect(result.search).toBe('');
  });

  it('passes through a falsy url unchanged', () => {
    expect(clearURLOfParams(undefined as any)).toBeUndefined();
  });
});

describe('getDemographicsFromPatient', () => {
  it('extracts populated fields and drops empty ones', () => {
    const patient = {
      resourceType: 'Patient',
      name: [{ given: ['Jane'], family: 'Doe' }],
      birthDate: '1990-01-01',
      gender: 'female',
      identifier: [{ type: { coding: [{ code: 'MR' }] }, value: 'mrn-1' }],
      telecom: [
        { system: 'phone', value: '555-1234' },
        { system: 'email', value: 'jane@example.com' }
      ],
      address: [{ line: ['123 Main St', 'Apt 4'], city: 'Springfield', state: 'WA', postalCode: '98001', country: 'US' }],
      communication: [
        { preferred: true, language: { text: 'English' } },
        { preferred: false, language: { text: 'Spanish' } },
        { preferred: false, language: { text: 'French' } }
      ]
    };

    const demographics = getDemographicsFromPatient(patient as any);

    expect(demographics).toEqual({
      first: 'Jane',
      last: 'Doe',
      dob: '1990-01-01',
      gender: 'female',
      mrn: 'mrn-1',
      phone: '555-1234',
      email: 'jane@example.com',
      address1: '123 Main St',
      address2: 'Apt 4',
      city: 'Springfield',
      state: 'WA',
      zip: '98001',
      country: 'US',
      preferredLanguage: 'English',
      languages: 'Spanish, French'
    });
  });

  it('omits fields that are absent on a minimal patient', () => {
    const demographics = getDemographicsFromPatient({ resourceType: 'Patient' } as any);
    expect(demographics).toEqual({});
  });
});

describe('constructPatientResource', () => {
  it('builds a fresh patient resource from demographics when no base patient is given', () => {
    const patient = constructPatientResource({ first: 'Jane', last: 'Doe', dob: '1990-01-01', gender: 'female' });

    expect(patient.resourceType).toBe('Patient');
    expect(patient.name).toEqual([{ given: ['Jane'], family: 'Doe' }]);
    expect(patient.birthDate).toBe('1990-01-01');
    expect(patient.gender).toBe('female');
  });

  it.each([
    ['male', 'male'],
    ['female', 'female'],
    ['non-binary', 'other'],
    ['other', 'other'],
    ['something-unrecognized', 'unknown']
  ])('maps gender input "%s" to FHIR gender "%s"', (input, expected) => {
    const patient = constructPatientResource({ gender: input as any });
    expect(patient.gender).toBe(expected);
  });

  it('adds phone and email telecom entries', () => {
    const patient = constructPatientResource({ phone: '555-1234', email: 'jane@example.com' });
    expect(patient.telecom).toEqual([
      { system: 'phone', value: '555-1234' },
      { system: 'email', value: 'jane@example.com' }
    ]);
  });

  it('adds preferred and additional communication languages', () => {
    const patient = constructPatientResource({ preferredLanguage: 'English', languages: ['Spanish', 'French'] });
    expect(patient.communication).toEqual([
      { preferred: true, language: { text: 'English' } },
      { language: { text: 'Spanish' } },
      { language: { text: 'French' } }
    ]);
  });

  it('adds an MRN identifier', () => {
    const patient = constructPatientResource({ mrn: 'mrn-1' });
    expect(patient.identifier).toEqual([
      {
        use: 'usual',
        type: {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR', display: 'Medical Record Number' }],
          text: 'Medical Record Number'
        },
        system: 'http://hospital.smarthealthit.org',
        value: 'mrn-1'
      }
    ]);
  });

  it('adds custom identifiers alongside an MRN, replacing any with the same system', () => {
    const patient = constructPatientResource({
      mrn: 'mrn-1',
      customIdentifiers: [{ system: 'http://example.org/custom', value: 'custom-1' }]
    });

    expect(patient.identifier).toContainEqual({ system: 'http://example.org/custom', value: 'custom-1' });
    expect(patient.identifier).toHaveLength(2);
  });

  it('keeps pre-existing identifiers on the base patient alongside new customIdentifiers', () => {
    const basePatient: any = {
      resourceType: 'Patient',
      identifier: [{ system: 'http://example.org/existing', value: 'existing-1' }]
    };

    const patient = constructPatientResource(
      { customIdentifiers: [{ system: 'http://example.org/new', value: 'new-1' }] },
      basePatient
    );

    expect(patient.identifier).toEqual([
      { system: 'http://example.org/existing', value: 'existing-1' },
      { system: 'http://example.org/new', value: 'new-1' }
    ]);
  });

  it('replaces an existing identifier with a customIdentifier of the same system rather than duplicating it', () => {
    const basePatient: any = {
      resourceType: 'Patient',
      identifier: [{ system: 'http://example.org/shared', value: 'old-value' }]
    };

    const patient = constructPatientResource(
      { customIdentifiers: [{ system: 'http://example.org/shared', value: 'new-value' }] },
      basePatient
    );

    expect(patient.identifier).toEqual([{ system: 'http://example.org/shared', value: 'new-value' }]);
  });

  it('builds an address from the individual components', () => {
    const patient = constructPatientResource({ address1: '123 Main St', address2: 'Apt 4', city: 'Springfield', state: 'WA', zip: '98001', country: 'US' });
    expect(patient.address).toEqual([{ line: ['123 Main St', 'Apt 4'], city: 'Springfield', state: 'WA', postalCode: '98001', country: 'US' }]);
  });

  it('adds extensions for religion, culture, community, pronouns, and sex characteristics', () => {
    const patient = constructPatientResource({
      religion: { system: 'http://example.org/religion', code: 'r1' },
      culture: 'Some Culture',
      community: 'Some Community',
      pronouns: { system: 'http://example.org/pronouns', code: 'they-them' },
      sexCharacteristics: { system: 'http://example.org/sex-char', code: 'x1' }
    });

    expect(patient.extension).toContainEqual({
      url: 'http://hl7.org/fhir/StructureDefinition/patient-religion',
      valueCodeableConcept: { coding: [{ system: 'http://example.org/religion', code: 'r1' }] }
    });
    expect(patient.extension).toContainEqual({
      url: 'http://healthintersections.com.au/fhir/StructureDefinition/patient-cultural-background',
      valueString: 'Some Culture'
    });
    expect(patient.extension).toHaveLength(5);
  });

  it('sets a given id when provided', () => {
    const patient = constructPatientResource({ id: 'explicit-id' });
    expect(patient.id).toBe('explicit-id');
  });
});

describe('buildPatientSearchQuery', () => {
  it('builds the minimal query when no demographics are given', () => {
    expect(buildPatientSearchQuery()).toBe('?_count=1&active=true');
  });

  it('includes every supplied field in a fixed order, URI-encoding email', () => {
    const query = buildPatientSearchQuery({
      first: 'Jane',
      last: 'Doe',
      dob: '1990-01-01',
      gender: 'female',
      mrn: 'mrn-1',
      phone: '555-1234',
      email: 'jane+test@example.com',
      address1: '123 Main St',
      address2: 'Apt 4',
      city: 'Springfield',
      state: 'WA',
      zip: '98001'
    });

    expect(query).toBe(
      '?_count=1&active=true&birthdate=1990-01-01&given=Jane&family=Doe&gender=female&identifier=mrn-1' +
        '&phone=555-1234&email=jane%2Btest%40example.com&address=123+Main+St+Apt+4&address-city=Springfield' +
        '&address-state=WA&address-postalcode=98001'
    );
  });

  it('runs the result through the given callback', () => {
    const query = buildPatientSearchQuery({ first: 'Jane' }, (q: string) => `${q}&extra=1`);
    expect(query).toBe('?_count=1&active=true&given=Jane&extra=1');
  });
});

describe('download', () => {
  it('creates, clicks, and removes a temporary anchor element', () => {
    const realCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = realCreateElement(tagName);
      if (tagName === 'a') vi.spyOn(el, 'click');
      return el;
    });
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    download('notes.txt', 'hello world');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    const anchor = createElementSpy.mock.results[0].value as HTMLAnchorElement;
    expect(anchor.getAttribute('download')).toBe('notes.txt');
    expect(anchor.getAttribute('href')).toBe('data:text/plain;charset=utf-8,hello%20world');
    expect(anchor.click).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalledWith(anchor);
    expect(removeSpy).toHaveBeenCalledWith(anchor);

    createElementSpy.mockRestore();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });
});

describe('fetchEverything', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('follows next links across pages and collects every resource', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          entry: [{ resource: { resourceType: 'Observation', id: 'obs-1' } }],
          link: [{ relation: 'next', url: 'https://fhir.example.com/page2' }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          entry: [{ resource: { resourceType: 'Observation', id: 'obs-2' } }]
        })
      });

    const result = await fetchEverything('https://fhir.example.com/page1', {});

    expect(result).toEqual([
      { resourceType: 'Observation', id: 'obs-1' },
      { resourceType: 'Observation', id: 'obs-2' }
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('https://fhir.example.com/page2');
  });

  it('upgrades an http next link to https', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          entry: [],
          link: [{ relation: 'next', url: 'http://fhir.example.com/page2' }]
        })
      })
      .mockResolvedValueOnce({ ok: true, json: vi.fn().mockResolvedValue({ entry: [] }) });

    await fetchEverything('https://fhir.example.com/page1', {});

    expect(fetchMock.mock.calls[1][0]).toBe('https://fhir.example.com/page2');
  });

  it('throws when a page request fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: vi.fn().mockResolvedValue('server error') });

    await expect(fetchEverything('https://fhir.example.com/page1', {})).rejects.toThrow(/FHIR request failed/);
  });
});
