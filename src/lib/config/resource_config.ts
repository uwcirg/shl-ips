import type { ComponentType } from 'svelte';
import GenericResource from '$lib/components/resource-templates/GenericResource.svelte';

import AdvanceDirective from '$lib/components/resource-templates/AdvanceDirective.svelte';
import AllergyIntolerance from '$lib/components/resource-templates/AllergyIntolerance.svelte';
import Condition from '$lib/components/resource-templates/Condition.svelte';
import Coverage from '$lib/components/resource-templates/Coverage.svelte';
import Device from '$lib/components/resource-templates/Device.svelte';
import DeviceUseStatement from '$lib/components/resource-templates/DeviceUseStatement.svelte';
import DiagnosticReport from '$lib/components/resource-templates/DiagnosticReport.svelte';
import Encounter from '$lib/components/resource-templates/Encounter.svelte';
import ExplanationOfBenefit from '$lib/components/resource-templates/ExplanationOfBenefit.svelte';
import Goal from '$lib/components/resource-templates/Goal.svelte';
import Immunization from '$lib/components/resource-templates/Immunization.svelte';
import Location from '$lib/components/resource-templates/Location.svelte';
import Medication from '$lib/components/resource-templates/Medication.svelte';
import MedicationRequest from '$lib/components/resource-templates/MedicationRequest.svelte';
import MedicationStatement from '$lib/components/resource-templates/MedicationStatement.svelte';
import Observation from '$lib/components/resource-templates/Observation.svelte';
import Organization from '$lib/components/resource-templates/Organization.svelte';
import Patient from '$lib/components/resource-templates/Patient.svelte';
import Practitioner from '$lib/components/resource-templates/Practitioner.svelte';
import Procedure from '$lib/components/resource-templates/Procedure.svelte';
import QuestionnaireResponse from '$lib/components/resource-templates/QuestionnaireResponse.svelte';
import ObservationGroup from '$lib/components/resource-templates/ObservationGroup.svelte';
import DiagnosticReportGroup from '$lib/components/resource-templates/DiagnosticReportGroup.svelte';
import DeviceUseStatementGroup from '$lib/components/resource-templates/DeviceUseStatementGroup.svelte';
import EncounterGroup from '$lib/components/resource-templates/EncounterGroup.svelte';

export const RESOURCE_TYPE_FALLBACK_KEY = 'Other';

// A rule that moves a resource out of its type's default `category` when `match` is true.
// Rules are tried in order and the first match wins.
export interface CategoryRule {
  category: string;
  match: (resource: any) => boolean;
}

const LOINC_CODE_PREGNANCY_STATUS = "82810-3";
const LOINC_CODE_NUMBER_BIRTHS_LIVE = "11636-8";
const LOINC_CODE_NUMBER_BIRTHS_PRETERM = "11637-6";
const LOINC_CODE_NUMBER_BIRTHS_STILL_LIVING = "11638-4";
const LOINC_CODE_NUMBER_BIRTHS_TERM = "11639-2";
const LOINC_CODE_NUMBER_BIRTHS_TOTAL = "11640-0";
const LOINC_CODE_NUMBER_ABORTIONS = "11612-9";
const LOINC_CODE_NUMBER_ABORTIONS_INDUCED = "11613-7";
const LOINC_CODE_NUMBER_ABORTIONS_SPONTANEOUS = "11614-5";
const LOINC_CODE_NUMBER_ECTOPIC_PREGNANCY = "33065-4";

const PREGNANCY_CODES = [
  LOINC_CODE_PREGNANCY_STATUS,
  LOINC_CODE_NUMBER_BIRTHS_LIVE,
  LOINC_CODE_NUMBER_BIRTHS_PRETERM,
  LOINC_CODE_NUMBER_BIRTHS_STILL_LIVING,
  LOINC_CODE_NUMBER_BIRTHS_TERM,
  LOINC_CODE_NUMBER_BIRTHS_TOTAL,
  LOINC_CODE_NUMBER_ABORTIONS,
  LOINC_CODE_NUMBER_ABORTIONS_INDUCED,
  LOINC_CODE_NUMBER_ABORTIONS_SPONTANEOUS,
  LOINC_CODE_NUMBER_ECTOPIC_PREGNANCY
];

const isPregnancy = (resource: any): boolean =>
  resource.code?.coding?.some((c: any) => PREGNANCY_CODES.includes(c?.code));

// True if any of the Observation's category codings has this code
const hasObservationCategory = (code: string) => (resource: any): boolean =>
  (resource.category ?? []).some((cc: any) => cc?.coding?.some((c: any) => c?.code === code));

export const RESOURCE_CONFIG: Record<string, any> = {
    [RESOURCE_TYPE_FALLBACK_KEY]: {
      category: 'Other',
      component: GenericResource,
    },
    'AllergyIntolerance': {
      category: 'Allergies and Intolerances',
      component: AllergyIntolerance,
      sortFields: ['onset', 'lastOccurrence', 'recordedDate']
    },
    'Condition': {
      category: 'Conditions',
      component: Condition,
      sortFields: ['onset', 'abatement', 'recordedDate']
    },
    'Consent': {
      category: 'Advance Directives',
      component: AdvanceDirective,
      sortFields: ['dateTime']
    },
    'Coverage': {
      category: 'Insurance Policies',
      component: Coverage,
      sortFields: ['period']
    },
    'Device': {
      category: 'Devices',
      component: Device,
    },
    'DeviceUseStatement': {
      category: 'Devices',
      component: DeviceUseStatement,
      sortFields: ['timing', 'recordedOn']
    },
    'DiagnosticReport': {
      category: 'Diagnostics',
      component: DiagnosticReport,
      sortFields: ['effective', 'instant']
    },
    'DocumentReference': {
      category: 'Documents',
      component: AdvanceDirective,
      sortFields: ['date']
    },
    'Encounter': {
      category: 'Encounters',
      component: Encounter,
      sortFields: ['period']
    },
    'ExplanationOfBenefit': {
      category: 'Explanations of Benefits',
      component: ExplanationOfBenefit,
      sortFields: ['created', 'billablePeriod']
    },
    'Goal': {
      category: 'Goals',
      component: Goal,
      sortFields: ['start', 'target']
    },
    'Immunization': {
      category: 'Immunizations',
      component: Immunization,
      sortFields: ['occurrence']
    },
    'Location': {
      category: 'Locations',
      component: Location,
    },
    'Medication': {
      category: 'Medications',
      component: Medication,
    },
    'MedicationRequest': {
      category: 'Medications',
      component: MedicationRequest,
      sortFields: ['reported', 'authoredOn']
    },
    'MedicationStatement': {
      category: 'Medications',
      component: MedicationStatement,
      sortFields: ['effective', 'dateAsserted']
    },
    'Observation': {
      // Observations with none of the categories below stay here
      category: 'Other Observations',
      categoryRules: [
        { category: 'Pregnancies', match: isPregnancy },
        { category: 'Vital Signs', match: hasObservationCategory('vital-signs') },
        { category: 'Lab Results', match: hasObservationCategory('laboratory') },
        { category: 'Occupation & Social History', match: hasObservationCategory('social-history') },
        { category: 'Imaging Results', match: hasObservationCategory('imaging') },
        { category: 'Surveys', match: hasObservationCategory('survey') },
      ] as CategoryRule[],
      component: Observation,
      sortFields: ['effective', 'issued']
    },
    'Organization': {
      category: 'Organizations',
      component: Organization,
    },
    'Patient': {
      category: 'Patient Data',
      component: Patient,
    },
    'Practitioner': {
      category: 'Practitioners',
      component: Practitioner,
    },
    'Procedure': {
      category: 'Procedures',
      component: Procedure,
      sortFields: ['performed']
    },
    'QuestionnaireResponse': {
      category: 'Questionnaires',
      component: QuestionnaireResponse,
      sortFields: ['authored']
    },
    'RelatedPerson': {
      category: 'Family Members',
      component: Patient,
    },
  };

// Utility resources exist mostly to be referenced by others (the Organization and Practitioner an
// Encounter or prescription points at), so the data views don't list them on their own: they show
// only in advanced mode. Views of a dataset being imported show every resource.
export const UTILITY_RESOURCE_TYPES: ReadonlySet<string> = new Set([
  'Practitioner',
  'PractitionerRole',
  'Location',
  'Organization'
]);
export const isUtilityResourceType = (resourceType: string) => UTILITY_RESOURCE_TYPES.has(resourceType);

// Templates for grouped display units (see $lib/stores/displayUnits), keyed by groupType.
// Unlike RESOURCE_CONFIG these take `unit` rather than `content`.
export const GROUP_COMPONENTS: Record<string, ComponentType> = {
  observationSeries: ObservationGroup,
  diagnosticReport: DiagnosticReportGroup,
  deviceUseStatement: DeviceUseStatementGroup,
  encounter: EncounterGroup,
};
