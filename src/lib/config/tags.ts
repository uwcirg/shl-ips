export const METHODS = {
  ADVANCE_DIRECTIVES_CREATE_POLST: "advance-directives-create-polst",
  ADVANCE_DIRECTIVES_SEARCH: "advance-directives-search",
  OCCUPATIONAL_DATA_FOR_HEALTH_FORM: "occupational-data-for-health-form",
  PATIENT_BODY_CONCERNS_FORM: "patient-body-concerns-form",
  PATIENT_IDENTITY_FORM: "patient-identity-form",
  PATIENT_MEDICAL_HISTORY_FORM: "patient-medical-history-form",
  PATIENT_CARE_NEEDS_FORM: "patient-care-needs-form",
  PATIENT_STORY_FORM: "patient-story-form",
  PROVIDER_HEALTH_RECORD_SOF: "provider-health-record-sof",
  PROVIDER_HEALTH_RECORD_SOF_SEARCH: "provider-health-record-sof-search",
  PROVIDER_HEALTH_RECORD_URL: "provider-health-record-url",
  PROVIDER_HEALTH_RECORD_CARINBB: "provider-health-record-carinbb",
  PROVIDER_HEALTH_RECORD_TEFCA: "provider-health-record-tefca",
  PROVIDER_HEALTH_RECORD_FILE: "provider-health-record-file",
} as const;
export type Method = typeof METHODS[keyof typeof METHODS];

export const CATEGORIES = {
  ADVANCE_DIRECTIVES: "advance-directives",
  OCCUPATIONAL_DATA_FOR_HEALTH: "occupational-data-for-health",
  PATIENT_STORY: "patient-story",
  PROVIDER_HEALTH_RECORD: "provider-health-record",
} as const;
export type Category = typeof CATEGORIES[keyof typeof CATEGORIES];