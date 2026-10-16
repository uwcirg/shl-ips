import type { Composition, CompositionSection, Bundle, BundleEntry, Encounter, Flag, Reference, Resource } from 'fhir/r4';
import { INTERMEDIATE_FHIR_SERVER_BASE } from '$lib/config/config';
import { METHODS, type Method } from '$lib/config/tags';

export interface SectionUpdates {
  entries: BundleEntry[];
  section: CompositionSection;
}

interface IntermediateSectionUpdates {
  resources: Resource[];
  section: CompositionSection;
}

// Narrative divs must be valid XHTML, so escape values taken from resources
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export class SectionExtenderRegistry {
  registry: Record<Method, SectionExtender>;

  patientStorySectionExtender = new PatientStorySectionExtender();
  advanceDirectivesSectionExtender = new AdvanceDirectivesSectionExtender();
  alertsSectionExtender = new AlertsSectionExtender();

  historyOfIllnessSectionExtender = new HistoryOfIllnessSectionExtender();
  encounterSectionExtender = new EncounterSectionExtender();
  

  registeredExtenders = new Set<SectionExtender>();
  // Extenders that run on every IPS regardless of which methods were used
  alwaysRunExtenders: SectionExtender[] = [
    this.historyOfIllnessSectionExtender,
  ];

  constructor() {
    this.registry = {
      [METHODS.ADVANCE_DIRECTIVES_CREATE_POLST]: this.advanceDirectivesSectionExtender,
      [METHODS.ADVANCE_DIRECTIVES_SEARCH]: this.advanceDirectivesSectionExtender,
      [METHODS.PATIENT_STORY_FORM]: this.patientStorySectionExtender,
    }
    Object.freeze(this.registry);
  }

  register(method: Method): SectionExtender | undefined {
    const extender = this.getExtender(method);
    if (!extender) {
      return undefined;
    }
    this.registeredExtenders.add(extender);
    return extender;
  }

  // Extenders that opt in to being triggered by the content of a resource (via their own
  // matchesResource) rather than the dataset's method.
  // A resource is claimed by at most one extender: the first match in this list wins.
  resourceMatchingExtenders: SectionExtender[] = [
    this.patientStorySectionExtender,
    this.advanceDirectivesSectionExtender,
    this.alertsSectionExtender,
    this.encounterSectionExtender,
  ];

  registerForResource(resource: Resource): SectionExtender | undefined {
    const extender = this.resourceMatchingExtenders.find(e => e.matchesResource(resource));
    if (extender) {
      this.registeredExtenders.add(extender);
    }
    return extender;
  }

  getExtender(method: Method): SectionExtender | undefined {
    const extender = this.registry[method];
    return extender;
  }

  getRegisteredExtenders(): SectionExtender[] {
    return Array.from(this.registeredExtenders);
  }

  getAlwaysRunExtenders(): SectionExtender[] {
    return [...this.alwaysRunExtenders];
  }
}

abstract class SectionExtender {
  template: CompositionSection;
  // When false, a missing section is only created if there are new resources to put in it
  createWhenNoNewResources = true;

  abstract sectionSelector(section: CompositionSection): boolean;

  // Whether a resource should trigger this extender on its own. Only consulted for extenders
  // listed in the registry's resourceMatchingExtenders; override to opt in.
  matchesResource(_resource: Resource): boolean {
    return false;
  }

  abstract computeUpdates(newResources: Resource[], existingResources: Resource[], section: CompositionSection): IntermediateSectionUpdates | undefined;

  extend(newResources: Resource[], ips: Bundle): SectionUpdates | undefined {
    const composition = ips?.entry?.find(entry => entry.resource?.resourceType === "Composition")?.resource as Composition;
    const existingSection = composition?.section?.find(s => this.sectionSelector(s));
    if (!existingSection && !this.createWhenNoNewResources && newResources.length === 0) {
      return undefined;
    }
    const section = existingSection ?? JSON.parse(JSON.stringify(this.template));
    if (!this.sectionSelector(section)) {
      console.error(`Invalid section for ${this.getSectionTitle()}`);
      return undefined;
    }

    const existingRefs: Reference[] = existingSection?.entry ?? [];
    const existingResources: Resource[] = existingRefs
      .map((e: Reference) => e.reference?.split("/").pop() ?? "")
      .map((id: string) => ips.entry?.find((e: BundleEntry) => e.resource?.id === id)?.resource)
      .filter((r): r is Resource => !!r);
    
    const updates: IntermediateSectionUpdates | undefined = this.computeUpdates(newResources, existingResources, section);
    if (!updates) {
      return undefined;
    }
    if (!this.sectionSelector(updates.section)) {
      throw Error(`Failed to generate valid section for ${section.title}`);
    }
    const entries = this.resourcesToEntries(updates.resources);
    updates.section.entry.push(...this.referencesFromEntries(entries));
    return {
      entries,
      section: updates.section
    };
  }

  getSectionTitle(): string {
    return this.template.title;
  }

  resourcesToEntries(resources: Resource[]): BundleEntry[] {
    return resources.map(r => ({
      fullUrl: this.generateFullUrl(r),
      resource: r
    }));
  }

  referencesFromEntries(entries: BundleEntry[]): Reference[] {
    return entries.map(e => {return { reference: this.generateReferenceString(e.resource) }});
  }

  generateFullUrl(resource: Resource): string {
    return `${INTERMEDIATE_FHIR_SERVER_BASE}/${resource.resourceType}/${resource.id}`;
  }
  
  generateReferenceString(resource: Resource): string {
    return `${resource.resourceType}/${resource.id}`;
  }
}

class PatientStorySectionExtender extends SectionExtender {
  template = {
    title: "Patient Story",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "81338-6",
          display: "Patient Story"
        }
      ]
    },
    text: {
      status: "generated",
      div: ""
    },
    extension: [
      {
        url: "http://healthintersections.com.au/fhir/StructureDefinition/patient-story",
        valueString: ""
      }
    ],
    entry: []
  };

  matchesResource(resource: Resource): boolean {
    return resource.resourceType === 'Goal';
  }

  sectionSelector(section: CompositionSection): boolean {
    return (
      section.title === "Patient Story" &&
      section.code?.coding?.find(
        (coding) => coding.code === "81338-6" && coding.system === "http://loinc.org"
      )
    );
  }

  computeUpdates(newResources: Resource[], existingResources: Resource[], section: CompositionSection): IntermediateSectionUpdates {
    const currentDiv = section.text.div || '';
    let existingDivContent = currentDiv;
    if (currentDiv) {
      existingDivContent = existingDivContent.replace(/^<div xmlns=\"http:\/\/www.w3.org\/1999\/xhtml\">/g, "");
      existingDivContent = existingDivContent.replace(/<\/div>\s*$/, "");
    }

    let story = newResources.find(r => r.resourceType == 'Observation')?.valueString;
    let patientStoryHTML = "";
    if (story) {
      section.extension[0].valueString = story;
      patientStoryHTML = `<p>${story}</p>`;
    }
  
    let goalResources = newResources.filter(r => r.resourceType == 'Goal');
    let patientGoalsHTML = goalResources.length > 0
      ? `<p><strong>Patient's Goals</strong></p><ul>${
        goalResources.map(goal => `<li>${goal.description.text}</li>`).join('')
      }</ul>`
      : "";
  
    section.text.div = `<div xmlns="http://www.w3.org/1999/xhtml">
      ${existingDivContent}
      ${patientStoryHTML}
      ${patientGoalsHTML}
    </div>`;
  
    newResources = newResources.filter(r => r.resourceType !== 'Observation');
  
    return { resources: newResources, section };
  }
}

class AdvanceDirectivesSectionExtender extends SectionExtender {
  template = {
      title: "Advance Directives",
      code: {
          coding: [
          {
              system: "http://loinc.org",
              code: "42348-3",
              display: "Advance Directives"
          }
          ]
      },
      text: {
              status: "generated",
              div: "<div xmlns=\"http://www.w3.org/1999/xhtml\"><h5>Advance Directives</h5><table class=\"hapiPropertyTable\"><thead><tr><th>Scope</th><th>Status</th><th>Action Controlled</th><th>Date</th></tr></thead><tbody></tbody></table></div>"
            },
      entry: []
  };

  sectionSelector(section: CompositionSection): boolean {
    return (
      section.title === "Advance Directives" &&
      section.code?.coding?.find(
        (coding) => coding.code === "42348-3" && coding.system === "http://loinc.org"
      )
    );
  }

  matchesResource(resource: Resource): boolean {
    return (
      resource.resourceType === 'DocumentReference' &&
      !!resource.category?.some(c => c.coding?.some(
        coding => coding.code === "42348-3" && coding.system === "http://loinc.org"
      ))
    );
  }

  computeUpdates(newResources: Resource[], existingResources: Resource[], section: CompositionSection): IntermediateSectionUpdates {
    return { resources: newResources, section };
  }
}

class AlertsSectionExtender extends SectionExtender {
  createWhenNoNewResources = false;
  template = {
    title: "Alerts",
    code: {
      coding: [
        {
          system: "http://loinc.org",
          code: "104605-1",
          display: "Alert"
        }
      ]
    },
    text: {
      status: "generated",
      div: ""
    },
    entry: []
  };

  matchesResource(resource: Resource): boolean {
    return resource.resourceType === 'Flag';
  }

  sectionSelector(section: CompositionSection): boolean {
    return (
      section.code?.coding?.find(
        (coding) => coding.code === "104605-1" && coding.system === "http://loinc.org"
      )
    );
  }

  computeUpdates(newResources: Resource[], existingResources: Resource[], section: CompositionSection): IntermediateSectionUpdates {
    const currentDiv = section?.text?.div || '';
    if (!newResources || newResources.length === 0) {
      return { resources: newResources, section };
    }
    // With an existing narrative, only add the new flags to avoid repeating the old ones
    const flags = (currentDiv ? newResources : [...existingResources, ...newResources])
      .filter((r): r is Flag => r.resourceType === 'Flag');
    const flagRows = flags.map(f => {
      const coding = f.code?.coding?.[0];
      const alert = f.code?.text ?? coding?.display ?? coding?.code ?? 'Alert';
      const date = f.period?.start?.substring(0, 10) ?? '';
      return `<tr><td>${escapeHtml(alert)}</td><td>${escapeHtml(f.status ?? '')}</td><td>${escapeHtml(date)}</td></tr>`;
    }).join('');
    const flagsHTML = flags.length > 0
      ? `<h5>${this.getSectionTitle()}</h5><table class="hapiPropertyTable"><thead><tr><th>Alert</th><th>Status</th><th>Date</th></tr></thead><tbody>${flagRows}</tbody></table>`
      : "";
    section.text.div = `<div xmlns="http://www.w3.org/1999/xhtml">
      ${currentDiv}
      ${flagsHTML}
    </div>`;

    return { resources: newResources, section };
  }
}

class HistoryOfIllnessSectionExtender extends SectionExtender {
  createWhenNoNewResources = false;
  template = {
      title: "History of Past Illness",
      code: {
          coding: [
          {
              system: "http://loinc.org",
              code: "11348-0",
              display: "History of Past Illness"
          }
          ]
      },
      text: {
              status: "generated",
              div: ""
            },
      entry: []
  };
  sectionSelector(section: CompositionSection): boolean {
    return (
      section.code?.coding?.find(
        (coding) => coding.code === "11348-0" && coding.system === "http://loinc.org"
      )
    );
  }

  computeUpdates(newResources: Resource[], existingResources: Resource[], section: CompositionSection): IntermediateSectionUpdates {
    const currentDiv = section?.text?.div || '';
    // This is only to add a missing narrative to an existing section
    if (!section || currentDiv) {
      return { resources: newResources, section };
    }
    let existingDivContent = currentDiv;

    let conditions = [...existingResources, ...newResources].filter(r => r.resourceType == 'Condition');
    let conditionCodings = conditions.map(c => c.code?.coding?.[0]).filter(coding => !!coding);
    let conditionsHTML = conditions.length > 0
      ? `<h5>${this.getSectionTitle()}</h5><table class="hapiPropertyTable"><thead><tr><th>Condition</th></tr></thead><tbody>${
        conditionCodings.map(coding => `<tr><td>${coding.display ?? coding.code}</td></tr>`).join('')
      }</tbody></table>`
      : "";
    section.text.div = `<div xmlns="http://www.w3.org/1999/xhtml">
      ${existingDivContent}
      ${conditionsHTML}
    </div>`;
  
    return { resources: newResources, section };
  }
}

class EncounterSectionExtender extends SectionExtender {
  createWhenNoNewResources = false;
  template = {
    "title" : "Encounters",
    "code" : {
      "coding" : [
        {
          "system": "http://loinc.org",
          "code": "46240-8",
          "display": "History of Hospitalizations+Outpatient visits Narrative"
        }
      ]
    },
    "text" : {
      "div" : "",
      "status" : "generated"
    },
    "entry" : []
  };

  matchesResource(resource: Resource): boolean {
    return resource.resourceType === 'Encounter';
  }

  sectionSelector(section: CompositionSection): boolean {
    return (
      section.code?.coding?.find(
        (coding) => coding.code === "46240-8" && coding.system === "http://loinc.org"
      )
    );
  }

  computeUpdates(newResources: Resource[], existingResources: Resource[], section: CompositionSection): IntermediateSectionUpdates {
    const currentDiv = section?.text?.div || '';
    if (!newResources || newResources.length === 0) {
      return { resources: newResources, section };
    }
    let existingDivContent = currentDiv;

    // With an existing narrative, only add the new encounters to avoid repeating the old ones
    const encounters = (existingDivContent ? newResources : [...existingResources, ...newResources])
      .filter((r): r is Encounter => r.resourceType === 'Encounter');
    const encounterRows = encounters.map(e => {
      const typeCoding = e.type?.[0]?.coding?.[0];
      const type = e.type?.[0]?.text ?? typeCoding?.display ?? typeCoding?.code ?? e.class?.display ?? e.class?.code ?? 'Encounter';
      const date = e.period?.start?.substring(0, 10) ?? '';
      return `<tr><td>${escapeHtml(type)}</td><td>${escapeHtml(date)}</td><td>${escapeHtml(e.status ?? '')}</td></tr>`;
    }).join('');
    const encountersHTML = encounters.length > 0
      ? `<h5>${this.getSectionTitle()}</h5><table class="hapiPropertyTable"><thead><tr><th>Encounter</th><th>Date</th><th>Status</th></tr></thead><tbody>${encounterRows}</tbody></table>`
      : "";
    section.text.div = `<div xmlns="http://www.w3.org/1999/xhtml">
      ${existingDivContent}
      ${encountersHTML}
    </div>`;

    return { resources: newResources, section };
  }
}
