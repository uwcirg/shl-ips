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

export const RESOURCE_CONFIG: Record<string, any> = {
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
      category: 'Observations and Results',
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