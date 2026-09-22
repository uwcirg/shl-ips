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

  it('returns undefined without transforming anything when the existing section does not match', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.getExtender(METHODS.PATIENT_STORY_FORM)!;
    const wrongSection = emptySection('Something Else', '00000-0');

    const result = extender.extend(
      [{ resourceType: 'Observation', id: 'obs-1', valueString: 'x' } as any],
      wrongSection
    );

    expect(result).toBeUndefined();
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
    const second = extender.extend([goal], first?.section);

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
      first?.section
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

  it('returns undefined when the existing section does not match', () => {
    const registry = new SectionExtenderRegistry();
    const extender = registry.getExtender(METHODS.ADVANCE_DIRECTIVES_CREATE_POLST)!;
    const wrongSection = emptySection('Something Else', '00000-0');

    expect(extender.extend([], wrongSection)).toBeUndefined();
  });
});
