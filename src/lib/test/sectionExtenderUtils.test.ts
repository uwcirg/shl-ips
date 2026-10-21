import { describe, expect, it, vi } from 'vitest';
import { SectionExtenderRegistry } from '$lib/utils/sectionExtenderUtils';
import { METHODS } from '$lib/config/tags';

// vi.mock factories are hoisted above this file's own top-level const declarations, so BASE
// must come from vi.hoisted() rather than a plain const, or the factory below sees it in its
// temporal dead zone ("Cannot access 'BASE' before initialization").
const { BASE } = vi.hoisted(() => ({ BASE: 'https://fhir.example.com' }));

vi.mock('$lib/config/config', () => ({
  INTERMEDIATE_FHIR_SERVER_BASE: BASE
}));

function emptySection(title: string, code: string): any {
  return {
    title,
    code: { coding: [{ system: 'http://loinc.org', code }] },
    text: { status: 'generated', div: '' },
    entry: []
  };
}

// extend() reads existing sections from the Composition in the IPS bundle
function ipsWithSections(...sections: any[]): any {
  return {
    resourceType: 'Bundle',
    type: 'document',
    entry: [{ resource: { resourceType: 'Composition', id: 'comp-1', section: sections } }]
  };
}

// Same as ipsWithSections, plus resources that sections can reference by "Type/id"
function ipsWithSectionsAndResources(sections: any[], resources: any[]): any {
  const ips = ipsWithSections(...sections);
  ips.entry.push(...resources.map(resource => ({ resource })));
  return ips;
}

describe('SectionExtenderRegistry', () => {
  it('resolves each configured method to its section extender', () => {
    const registry = new SectionExtenderRegistry();

    expect(registry.getExtender(METHODS.PATIENT_STORY_FORM)).toBe(registry.patientStorySectionExtender);
    expect(registry.getExtender(METHODS.ADVANCE_DIRECTIVES_CREATE_POLST)).toBe(registry.advanceDirectivesSectionExtender);
    expect(registry.getExtender(METHODS.ADVANCE_DIRECTIVES_SEARCH)).toBe(registry.advanceDirectivesSectionExtender);
  });

  it('returns undefined for a method with no registered extender', () => {
    const registry = new SectionExtenderRegistry();

    expect(registry.getExtender(METHODS.PATIENT_IDENTITY_FORM)).toBeUndefined();
  });

  it('register() adds the extender to the registered set and returns it', () => {
    const registry = new SectionExtenderRegistry();

    const extender = registry.register(METHODS.PATIENT_STORY_FORM);

    expect(extender).toBe(registry.patientStorySectionExtender);
    expect(registry.getRegisteredExtenders()).toEqual([registry.patientStorySectionExtender]);
  });

  it('register() returns undefined and registers nothing for an unmapped method', () => {
    const registry = new SectionExtenderRegistry();

    const extender = registry.register(METHODS.PATIENT_IDENTITY_FORM);

    expect(extender).toBeUndefined();
    expect(registry.getRegisteredExtenders()).toEqual([]);
  });

  it('dedupes the same extender registered under two different methods', () => {
    const registry = new SectionExtenderRegistry();

    registry.register(METHODS.ADVANCE_DIRECTIVES_CREATE_POLST);
    registry.register(METHODS.ADVANCE_DIRECTIVES_SEARCH);

    expect(registry.getRegisteredExtenders()).toEqual([registry.advanceDirectivesSectionExtender]);
  });

  it('keeps registrations independent across separate registry instances', () => {
    const registryA = new SectionExtenderRegistry();
    const registryB = new SectionExtenderRegistry();

    registryA.register(METHODS.PATIENT_STORY_FORM);

    expect(registryA.getRegisteredExtenders()).toHaveLength(1);
    expect(registryB.getRegisteredExtenders()).toHaveLength(0);
  });

  it('freezes the method-to-extender map against mutation', () => {
    const registry = new SectionExtenderRegistry();

    expect(() => {
      (registry.registry as any)[METHODS.PATIENT_IDENTITY_FORM] = null;
    }).toThrow();
  });
});

// PatientStorySectionExtender and AdvanceDirectivesSectionExtender aren't exported directly;
// they're only reachable as instances handed back by the registry, so they're exercised here
// through registry.getExtender(...) rather than importing the classes.
describe('PatientStorySectionExtender (via the registry)', () => {
  it('builds the Patient Story section from the template, embedding the story and goals', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.getExtender(METHODS.PATIENT_STORY_FORM)!;
    const observation = { resourceType: 'Observation', id: 'obs-1', valueString: 'My story text.' };
    const goal = { resourceType: 'Goal', id: 'goal-1', description: { text: 'Walk unaided' } };

    const result = extender.extend([observation, goal]);

    expect(result?.section.title).toBe('Patient Story');
    expect(result?.section.extension[0].valueString).toBe('My story text.');
    expect(result?.section.text.div).toContain('<p>My story text.</p>');
    expect(result?.section.text.div).toContain('<li>Walk unaided</li>');
    // The Observation that supplied the story is consumed; only the Goal becomes an entry.
    expect(result?.entries).toEqual([{ fullUrl: `${BASE}/Goal/goal-1`, resource: goal }]);
    expect(result?.section.entry).toEqual([{ reference: 'Goal/goal-1' }]);
  });

  it('ignores a non-matching section in the IPS and builds a new one from the template', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.getExtender(METHODS.PATIENT_STORY_FORM)!;
    const wrongSection = emptySection('Something Else', '00000-0');

    const result = extender.extend(
      [{ resourceType: 'Observation', id: 'obs-1', valueString: 'x' } as any],
      ipsWithSections(wrongSection)
    );

    expect(result?.section.title).toBe('Patient Story');
    expect(result?.section.text.div).toContain('x');
    expect(wrongSection.text.div).toBe('');
    expect(wrongSection.entry).toEqual([]);
  });

  it('leaves the story untouched instead of throwing when there is no Observation resource', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.getExtender(METHODS.PATIENT_STORY_FORM)!;
    const goal = { resourceType: 'Goal', id: 'goal-1', description: { text: 'Walk unaided' } };

    const result = extender.extend([goal]);

    // No Observation means `extension[0].valueString` is left alone rather than overwritten —
    // here that's still the template's untouched default, since this section came from the
    // template, not from a previous extension.
    expect(result?.section.extension[0].valueString).toBe('');
    expect(result?.section.text.div).toContain('<li>Walk unaided</li>');
    expect(result?.entries).toEqual([{ fullUrl: `${BASE}/Goal/goal-1`, resource: goal }]);
  });

  it('preserves a previous story when a later re-extension has no Observation of its own', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.getExtender(METHODS.PATIENT_STORY_FORM)!;

    const first = extender.extend([
      { resourceType: 'Observation', id: 'obs-1', valueString: 'First story.' } as any
    ]);
    const goal = { resourceType: 'Goal', id: 'goal-1', description: { text: 'Walk unaided' } };
    const second = extender.extend([goal], ipsWithSections(first?.section));

    expect(second?.section.extension[0].valueString).toBe('First story.');
    expect(second?.section.text.div).toContain('First story.');
  });

  it('cleanly nests the previous div content when re-extending an already-extended section', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.getExtender(METHODS.PATIENT_STORY_FORM)!;

    const first = extender.extend([
      { resourceType: 'Observation', id: 'obs-1', valueString: 'First story.' } as any
    ]);
    const second = extender.extend(
      [{ resourceType: 'Observation', id: 'obs-2', valueString: 'Second story.' } as any],
      ipsWithSections(first?.section)
    );

    const div = second?.section.text.div ?? '';
    expect(div).toContain('First story.');
    expect(div).toContain('Second story.');
    // Exactly one wrapper now, not a stray unmatched closing tag from the previous round.
    expect(div.match(/<div /g)).toHaveLength(1);
    expect(div.match(/<\/div>/g)).toHaveLength(1);
  });
});

describe('AdvanceDirectivesSectionExtender (via the registry)', () => {
  it('builds entries and references for the given resources without transforming them', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.getExtender(METHODS.ADVANCE_DIRECTIVES_SEARCH)!;
    const consent = { resourceType: 'Consent', id: 'consent-1' };

    const result = extender.extend([consent as any]);

    expect(result?.section.title).toBe('Advance Directives');
    expect(result?.entries).toEqual([{ fullUrl: `${BASE}/Consent/consent-1`, resource: consent }]);
    expect(result?.section.entry).toEqual([{ reference: 'Consent/consent-1' }]);
  });

  it('ignores a non-matching section in the IPS and builds a new one from the template', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.getExtender(METHODS.ADVANCE_DIRECTIVES_CREATE_POLST)!;
    const wrongSection = emptySection('Something Else', '00000-0');

    const result = extender.extend([], ipsWithSections(wrongSection));

    expect(result?.section.title).toBe('Advance Directives');
    expect(wrongSection.entry).toEqual([]);
  });
});

describe('resource-based extender detection (registerForResource)', () => {
  const advanceDirectiveDoc = (system = 'http://loinc.org', code = '42348-3'): any => ({
    resourceType: 'DocumentReference',
    id: 'doc-1',
    category: [{ coding: [{ system, code }] }]
  });
  const observationWithCode = (code: string, system = 'http://loinc.org'): any => ({
    resourceType: 'Observation',
    id: 'obs-1',
    code: { coding: [{ system, code }] }
  });

  it('maps each triggering resource to its extender and registers it', () => {
    const registry = new SectionExtenderRegistry();

    expect(registry.registerForResource({ resourceType: 'Goal', id: 'g1' } as any)).toBe(registry.patientStorySectionExtender);
    expect(registry.registerForResource({ resourceType: 'Encounter', id: 'e1' } as any)).toBe(registry.encounterSectionExtender);
    expect(registry.registerForResource({ resourceType: 'Flag', id: 'f1' } as any)).toBe(registry.alertsSectionExtender);
    expect(registry.registerForResource(advanceDirectiveDoc())).toBe(registry.advanceDirectivesSectionExtender);
    expect(registry.registerForResource(observationWithCode('11778-8'))).toBe(registry.pregnancySectionExtender);

    expect(registry.getRegisteredExtenders()).toEqual([
      registry.patientStorySectionExtender,
      registry.encounterSectionExtender,
      registry.alertsSectionExtender,
      registry.advanceDirectivesSectionExtender,
      registry.pregnancySectionExtender
    ]);
  });

  it('matches DocumentReferences only for the advance directives LOINC category', () => {
    const registry = new SectionExtenderRegistry();

    expect(registry.registerForResource(advanceDirectiveDoc('http://loinc.org', '11488-4'))).toBeUndefined();
    expect(registry.registerForResource(advanceDirectiveDoc('http://example.org', '42348-3'))).toBeUndefined();
    expect(registry.registerForResource({ resourceType: 'DocumentReference', id: 'doc-2' } as any)).toBeUndefined();
    expect(registry.getRegisteredExtenders()).toEqual([]);
  });

  it('matches pregnancy Observations by either expected delivery date code, and only by LOINC', () => {
    const registry = new SectionExtenderRegistry();

    expect(registry.registerForResource(observationWithCode('11778-8'))).toBe(registry.pregnancySectionExtender);
    expect(registry.registerForResource(observationWithCode('11779-6'))).toBe(registry.pregnancySectionExtender);
    expect(registry.registerForResource(observationWithCode('29463-7'))).toBeUndefined();
    expect(registry.registerForResource(observationWithCode('11778-8', 'http://example.org'))).toBeUndefined();
    expect(registry.registerForResource({ resourceType: 'Observation', id: 'obs-2' } as any)).toBeUndefined();
  });

  it('returns undefined and registers nothing for a resource no extender wants', () => {
    const registry = new SectionExtenderRegistry();

    expect(registry.registerForResource({ resourceType: 'Condition', id: 'c1' } as any)).toBeUndefined();
    expect(registry.registerForResource({ resourceType: 'Patient', id: 'p1' } as any)).toBeUndefined();
    expect(registry.getRegisteredExtenders()).toEqual([]);
  });

  it('dedupes an extender triggered by several resources', () => {
    const registry = new SectionExtenderRegistry();

    registry.registerForResource({ resourceType: 'Encounter', id: 'e1' } as any);
    registry.registerForResource({ resourceType: 'Encounter', id: 'e2' } as any);

    expect(registry.getRegisteredExtenders()).toEqual([registry.encounterSectionExtender]);
  });

  it('shares registration with method-based register() without double-counting', () => {
    const registry = new SectionExtenderRegistry();

    registry.register(METHODS.PATIENT_STORY_FORM);
    registry.registerForResource({ resourceType: 'Goal', id: 'g1' } as any);

    expect(registry.getRegisteredExtenders()).toEqual([registry.patientStorySectionExtender]);
  });

  it('lets at most one extender claim any resource', () => {
    const registry = new SectionExtenderRegistry();
    const samples = [
      { resourceType: 'Goal', id: 'g1' },
      { resourceType: 'Encounter', id: 'e1' },
      { resourceType: 'Flag', id: 'f1' },
      advanceDirectiveDoc(),
      observationWithCode('11778-8'),
      observationWithCode('11779-6'),
      { resourceType: 'Condition', id: 'c1' }
    ] as any[];

    for (const resource of samples) {
      const claimants = registry.resourceMatchingExtenders.filter(e => e.matchesResource(resource));
      expect(claimants.length).toBeLessThanOrEqual(1);
    }
  });

  it('does not let extenders outside the opt-in list claim resources', () => {
    const registry = new SectionExtenderRegistry();

    expect(registry.resourceMatchingExtenders).not.toContain(registry.historyOfIllnessSectionExtender);
    expect(registry.historyOfIllnessSectionExtender.matchesResource({ resourceType: 'Condition', id: 'c1' } as any)).toBe(false);
  });
});

describe('always-run extenders', () => {
  it('lists the history of illness extender and is independent of registration', () => {
    const registry = new SectionExtenderRegistry();

    expect(registry.getAlwaysRunExtenders()).toContain(registry.historyOfIllnessSectionExtender);
    expect(registry.getRegisteredExtenders()).toEqual([]);
  });

  it('returns a copy so callers cannot alter the always-run list', () => {
    const registry = new SectionExtenderRegistry();

    registry.getAlwaysRunExtenders().pop();

    expect(registry.getAlwaysRunExtenders()).toContain(registry.historyOfIllnessSectionExtender);
  });

  it('creates nothing when there is no existing section and no new resources', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.historyOfIllnessSectionExtender;

    expect(extender.extend([], ipsWithSections())).toBeUndefined();
  });

  it('adds a narrative from the conditions to an existing section that has none', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.historyOfIllnessSectionExtender;
    const section = emptySection('History of Past Illness', '11348-0');
    section.entry = [{ reference: 'Condition/c1' }];
    const condition = { resourceType: 'Condition', id: 'c1', code: { coding: [{ display: 'Asthma' }] } };

    const result = extender.extend([], ipsWithSectionsAndResources([section], [condition]));

    expect(result?.section.text.div).toContain('<td>Asthma</td>');
    expect(result?.entries).toEqual([]);
  });

  it('leaves an existing narrative untouched', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.historyOfIllnessSectionExtender;
    const section = emptySection('History of Past Illness', '11348-0');
    section.text.div = '<div xmlns="http://www.w3.org/1999/xhtml">Hand written</div>';
    section.entry = [{ reference: 'Condition/c1' }];
    const condition = { resourceType: 'Condition', id: 'c1', code: { coding: [{ display: 'Asthma' }] } };

    const result = extender.extend([], ipsWithSectionsAndResources([section], [condition]));

    expect(result?.section.text.div).toBe('<div xmlns="http://www.w3.org/1999/xhtml">Hand written</div>');
  });
});

describe('Resource-triggered section narratives (via the registry)', () => {
  it('builds an Encounters section with an escaped narrative table', () => {
    const registry = new SectionExtenderRegistry();
    const encounter = {
      resourceType: 'Encounter',
      id: 'enc-1',
      status: 'finished',
      type: [{ text: 'Clinic & <urgent> visit' }],
      period: { start: '2026-03-04T10:00:00Z' }
    };

    const result = registry.encounterSectionExtender.extend([encounter as any], ipsWithSections());

    expect(result?.section.title).toBe('Encounters');
    expect(result?.section.text.div).toContain(
      '<td>Clinic &amp; &lt;urgent&gt; visit</td><td>2026-03-04</td><td>finished</td>'
    );
    expect(result?.entries).toEqual([{ fullUrl: `${BASE}/Encounter/enc-1`, resource: encounter }]);
    expect(result?.section.entry).toEqual([{ reference: 'Encounter/enc-1' }]);
  });

  it('does not create an Encounters section when there are no new encounters', () => {
    const registry = new SectionExtenderRegistry();

    expect(registry.encounterSectionExtender.extend([], ipsWithSections())).toBeUndefined();
  });

  it('only appends new encounters when the section already has a narrative', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.encounterSectionExtender;
    const first = extender.extend(
      [{ resourceType: 'Encounter', id: 'enc-1', type: [{ text: 'First visit' }] } as any],
      ipsWithSections()
    );
    const second = extender.extend(
      [{ resourceType: 'Encounter', id: 'enc-2', type: [{ text: 'Second visit' }] } as any],
      ipsWithSections(first?.section)
    );

    const div = second?.section.text.div ?? '';
    expect(div.match(/First visit/g)).toHaveLength(1);
    expect(div.match(/Second visit/g)).toHaveLength(1);
  });

  it('builds an Alerts section from Flags with the alerts LOINC code', () => {
    const registry = new SectionExtenderRegistry();
    const flag = {
      resourceType: 'Flag',
      id: 'flag-1',
      status: 'active',
      code: { coding: [{ display: 'Latex allergy' }] },
      period: { start: '2025-11-20' }
    };

    const result = registry.alertsSectionExtender.extend([flag as any], ipsWithSections());

    expect(result?.section.title).toBe('Alerts');
    expect(result?.section.code.coding[0]).toMatchObject({ system: 'http://loinc.org', code: '104605-1' });
    expect(result?.section.text.div).toContain('<td>Latex allergy</td><td>active</td><td>2025-11-20</td>');
    expect(result?.section.entry).toEqual([{ reference: 'Flag/flag-1' }]);
  });

  it('does not create an Alerts section when there are no flags', () => {
    const registry = new SectionExtenderRegistry();

    expect(registry.alertsSectionExtender.extend([], ipsWithSections())).toBeUndefined();
  });

  it('builds a Pregnancy section whose narrative lists the observations', () => {
    const registry = new SectionExtenderRegistry();
    const observation = {
      resourceType: 'Observation',
      id: 'preg-1',
      code: { coding: [{ system: 'http://loinc.org', code: '11778-8', display: 'Estimated delivery date' }] },
      valueDateTime: '2026-12-01T00:00:00Z',
      effectiveDateTime: '2026-05-02'
    };

    const result = registry.pregnancySectionExtender.extend([observation as any], ipsWithSections());

    expect(result?.section.title).toBe('Pregnancy Information');
    expect(result?.section.text.div).toContain(
      '<td>Estimated delivery date</td><td>2026-12-01</td><td>2026-05-02</td>'
    );
    expect(result?.section.entry).toEqual([{ reference: 'Observation/preg-1' }]);
  });

  it('does not create a Pregnancy section when there are no new observations', () => {
    const registry = new SectionExtenderRegistry();

    expect(registry.pregnancySectionExtender.extend([], ipsWithSections())).toBeUndefined();
  });

  it('puts a triggering advance directive DocumentReference into the Advance Directives section', () => {
    const registry = new SectionExtenderRegistry();
    const doc = {
      resourceType: 'DocumentReference',
      id: 'doc-1',
      category: [{ coding: [{ system: 'http://loinc.org', code: '42348-3' }] }]
    };

    const result = registry.advanceDirectivesSectionExtender.extend([doc as any], ipsWithSections());

    expect(result?.section.title).toBe('Advance Directives');
    expect(result?.entries).toEqual([{ fullUrl: `${BASE}/DocumentReference/doc-1`, resource: doc }]);
  });
});
