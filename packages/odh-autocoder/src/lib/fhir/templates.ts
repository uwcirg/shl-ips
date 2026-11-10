import type { Observation } from 'fhir/r4';

// Resource templates for the Occupational Data for Health (ODH) IG profiles.
// Builders deep-copy these and fill in the values. They have no subject: builders add one
// only when the app supplies it (see OdhBuildOptions).

export const ODH_IS_CURRENT_JOB_EXTENSION =
	'http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension';

export const LOINC = {
	HISTORY_OF_OCCUPATION: '11341-5',
	EMPLOYMENT_STATUS: '74165-2',
	RETIREMENT_DATE: '87510-4',
	COMBAT_ZONE_PERIOD: '87511-2'
} as const;

// Present job resource template
export const currentJobTemplate: Observation = {
	resourceType: 'Observation',
	id: '',
	meta: {
		profile: ['http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob']
	},
	extension: [
		{
			url: 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension',
			valueBoolean: true
		}
	],
	status: 'final',
	category: [
		{
			coding: [
				{
					system: 'http://terminology.hl7.org/CodeSystem/observation-category',
					code: 'social-history'
				}
			]
		}
	],
	code: {
		coding: [
			{
				system: 'http://loinc.org',
				code: '11341-5',
				display: 'History of Occupation'
			}
		]
	},
	valueCodeableConcept: {
		coding: []
	},
	component: [
		{
			code: {
				coding: [
					{
						system: 'http://loinc.org',
						code: '86188-0',
						display: 'History of Occupation Industry'
					}
				]
			},
			valueCodeableConcept: {
				coding: []
			}
		}
	]
};

// Employment status resource template
export const employmentStatusTemplate: Observation = {
	resourceType: 'Observation',
	id: '',
	meta: {
		profile: ['http://hl7.org/fhir/us/odh/StructureDefinition/odh-EmploymentStatus']
	},
	status: 'final',
	category: [
		{
			coding: [
				{
					system: 'http://terminology.hl7.org/CodeSystem/observation-category',
					code: 'social-history'
				}
			]
		}
	],
	code: {
		coding: [
			{
				system: 'http://loinc.org',
				code: '74165-2',
				display: 'History of employment status NIOSH'
			}
		]
	},
	valueCodeableConcept: {
		coding: [
			{
				system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationValue',
				code: 'Employed',
				display: 'Employed'
			}
		]
	}
};

// Past job resource template
export const pastJobTemplate: Observation = {
	resourceType: 'Observation',
	id: '',
	meta: {
		profile: ['http://hl7.org/fhir/us/odh/StructureDefinition/odh-PastOrPresentJob']
	},
	extension: [
		{
			url: 'http://hl7.org/fhir/us/odh/StructureDefinition/odh-isCurrentJob-extension',
			valueBoolean: false
		}
	],
	status: 'final',
	category: [
		{
			coding: [
				{
					system: 'http://terminology.hl7.org/CodeSystem/observation-category',
					code: 'social-history'
				}
			]
		}
	],
	code: {
		coding: [
			{
				system: 'http://loinc.org',
				code: '11341-5',
				display: 'History of Occupation'
			}
		]
	},
	valueCodeableConcept: {
		coding: []
	},
	component: [
		{
			code: {
				coding: [
					{
						system: 'http://loinc.org',
						code: '86188-0',
						display: 'History of Occupation Industry'
					}
				]
			},
			valueCodeableConcept: {
				coding: []
			}
		}
	]
};

// Retirement date resource template
export const retirementDateTemplate: Observation = {
	resourceType: 'Observation',
	id: '126e7704-b9dc-4559-ad88-138ad7a3f237',
	meta: {
		profile: ['http://hl7.org/fhir/us/odh/StructureDefinition/odh-RetirementDate']
	},
	status: 'final',
	category: [
		{
			coding: [
				{
					system: 'http://terminology.hl7.org/CodeSystem/observation-category',
					code: 'social-history'
				}
			]
		}
	],
	code: {
		coding: [
			{
				system: 'http://loinc.org',
				code: '87510-4',
				display: 'Date of Retirement'
			}
		]
	},
	valueDateTime: ''
};

// Combat zone period resource template
export const combatPeriodTemplate: Observation = {
	resourceType: 'Observation',
	id: '',
	meta: {
		profile: ['http://hl7.org/fhir/us/odh/StructureDefinition/odh-CombatZonePeriod']
	},
	status: 'final',
	category: [
		{
			coding: [
				{
					system: 'http://terminology.hl7.org/CodeSystem/observation-category',
					code: 'social-history'
				}
			]
		}
	],
	code: {
		coding: [
			{
				system: 'http://loinc.org',
				code: '87511-2',
				display: 'Combat zone AndOr hazardous duty work dates'
			}
		]
	},
	valuePeriod: {
		start: '',
		end: ''
	}
};
