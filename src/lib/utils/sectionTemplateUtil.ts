import type { CompositionSection, Resource } from 'fhir/r4';

export function methodSectionHelper(method: string, resources: Resource[]): { resources: Resource[]; sectionKey: string; sectionTemplate: CompositionSection } {
  return methodSectionHelpers[method](resources);
}

let methodSectionHelpers: Record<string, Function> = {
  'patient-story-form': createPatientStorySection,
  'advance-directives-search': createAdvanceDirectivesSection
};

let patientStorySectionTemplate: CompositionSection = {
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
    div: "<div xmlns=\"http://www.w3.org/1999/xhtml\"><p>${story}</p>\n<p><strong>Patient's Goals</strong></p><ul>${goals}</ul></div>"
  },
  extension: [
    {
      url: "http://healthintersections.com.au/fhir/StructureDefinition/patient-story",
      valueString: ""
    }
  ],
  entry: []
};

function createPatientStorySection(resources: Resource[]): { resources: Resource[]; sectionKey: string; sectionTemplate: CompositionSection } {
  let sectionKey = "Patient Story";
  let section = JSON.parse(JSON.stringify(patientStorySectionTemplate));

  let story = resources.filter(r => r.resourceType == 'Observation')[0];
  section.extension[0].valueString = story.valueString;
  section.text.div = section.text.div.replace('${story}', story.valueString);

  let goals = resources.filter(r => r.resourceType == 'Goal');
  let goalsHtml =goals.map(goal => `<li>${goal.value}</li>`).join('');
  section.text.div = section.text.div.replace('${goals}', goalsHtml);

  resources = resources.filter(r => r.resourceType !== 'Observation');

  return { resources: resources, sectionKey: sectionKey, sectionTemplate: section };
}

let advanceDirectivesSectionTemplate = {
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

function createAdvanceDirectivesSection(resources: Resource[]): { resources: Resource[]; sectionKey: string; sectionTemplate: CompositionSection } {
  let sectionKey = "Advance Directives";
  let section = JSON.parse(JSON.stringify(advanceDirectivesSectionTemplate));
  section.entry = resources;
  return { resources: resources, sectionKey: sectionKey, sectionTemplate: section };
}