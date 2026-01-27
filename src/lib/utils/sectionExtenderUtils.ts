import type { CompositionSection, BundleEntry, Reference, Resource } from 'fhir/r4';
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

export class SectionExtenderRegistry {
  registry: Record<Method, SectionExtender>;

  patientStorySectionExtender = new PatientStorySectionExtender();
  advanceDirectivesSectionExtender = new AdvanceDirectivesSectionExtender();

  registeredExtenders = new Set<SectionExtender>();

  constructor() {
    this.registry = {
      [METHODS.ADVANCE_DIRECTIVES_CREATE_POLST]: this.advanceDirectivesSectionExtender,
      [METHODS.ADVANCE_DIRECTIVES_SEARCH]: this.advanceDirectivesSectionExtender,
      [METHODS.PATIENT_STORY_FORM]: this.patientStorySectionExtender
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

  getExtender(method: Method): SectionExtender | undefined {
    const extender = this.registry[method];
    return extender;
  }

  getRegisteredExtenders(): SectionExtender[] {
    return Array.from(this.registeredExtenders);
  }
}

abstract class SectionExtender {
  template: CompositionSection;

  abstract sectionSelector(section: CompositionSection): boolean;
  abstract computeUpdates(resources: Resource[], section: CompositionSection): IntermediateSectionUpdates | undefined;

  extend(resources: Resource[], existingSection?: CompositionSection): SectionUpdates | undefined {
    const section = existingSection ?? JSON.parse(JSON.stringify(this.template));
    if (!this.sectionSelector(section)) {
      return undefined;
    }
    const updates: IntermediateSectionUpdates | undefined = this.computeUpdates(resources, section);
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

  sectionSelector(section: CompositionSection): boolean {
    return (
      section.title === "Patient Story" &&
      section.code?.coding?.find(
        (coding) => coding.code === "81338-6" && coding.system === "http://loinc.org"
      )
    );
  }

  computeUpdates(resources: Resource[], section: CompositionSection): IntermediateSectionUpdates {
    const currentDiv = section.text.div || '';
    let existingDivContent = currentDiv;
    if (currentDiv) {
      existingDivContent = existingDivContent.replace(/^<div xmlns=\"http:\/\/www.w3.org\/1999\/xhtml\">/g, "");
      existingDivContent = existingDivContent.replace(/<div>$/g, "");
    }
  
    let story = resources.filter(r => r.resourceType == 'Observation')[0].valueString;
    section.extension[0].valueString = story;
    let patientStoryHTML = story ? `<p>${story}</p>`: "";
  
    let goalResources = resources.filter(r => r.resourceType == 'Goal');
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
  
    resources = resources.filter(r => r.resourceType !== 'Observation');
  
    return { resources, section };
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

  computeUpdates(resources: Resource[], section: CompositionSection): IntermediateSectionUpdates {
    return { resources, section };
  }
}
