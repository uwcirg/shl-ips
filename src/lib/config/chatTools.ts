import { z } from 'zod';

// Definitions of the health chat's record tools, shared by the server (which describes them to
// the model) and the browser (which validates each call's arguments and runs it, see
// recordTools.ts). Validation happens in the browser rather than in the AI SDK on the server so
// that an invalid call becomes an error result the model can read and correct, instead of
// failing the whole response.

export const RECORD_TOOL_DEFINITIONS = {
  listRecordTypes: {
    description:
      "List the kinds of data in the patient's record (FHIR resource types), with how many of " +
      'each and the date range they cover. Returns { types: [{ type, count, earliest?, ' +
      'latest? }] }. Call this first if unsure what the record contains.',
    parameters: z.object({})
  },
  searchRecords: {
    description:
      "Search the patient's record for FHIR R4 resources. Every filter given must match; omit " +
      'a filter to leave it unrestricted. ' +
      'Returns { totalMatches, returned, matchesByType, results, note? }: results are the ' +
      'matching resources, newest first, each with the resources it references attached as ' +
      '"referenced" (e.g. the Medication behind a MedicationRequest). matchesByType counts all ' +
      'matches, including those not returned. When returned is less than totalMatches the ' +
      'results are incomplete, so refine the filters to see the rest before relying on them to ' +
      'answer. A note explains an empty or incomplete result.',
    parameters: z.object({
      types: z
        .array(z.string())
        .optional()
        .describe(
          'FHIR resource types to include, matched exactly against resourceType, e.g. ' +
            '["Observation"]. Medications may be recorded as MedicationRequest, ' +
            'MedicationStatement or MedicationAdministration; use listRecordTypes to see which ' +
            'types the record contains.'
        ),
      statuses: z
        .array(z.string())
        .optional()
        .describe(
          'Array of status codes to include, e.g. ["active"] or ["completed", "stopped"]. ' +
            "Matched against the resource's status (e.g. \"active\", \"completed\", " +
            '"stopped") or clinicalStatus code (e.g. "active", "resolved"). Current ' +
            'medications, conditions and allergies have status "active".'
        ),
      text: z
        .string()
        .optional()
        .describe(
          'Words that must all appear (case-insensitive substring match) in the values of the ' +
            'resource or the resources it references, such as coded display names, values, ' +
            'units and notes. Does not match resourceType, ids or code system URLs, e.g. ' +
            '"a1c", "metformin", "blood pressure".'
        ),
      since: z
        .string()
        .optional()
        .describe('ISO 8601 date. Only resources whose clinical date is on or after it.'),
      until: z
        .string()
        .optional()
        .describe('ISO 8601 date. Only resources whose clinical date is on or before it.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Most results to return, 1 to 20 (default 10)')
    })
  }
};

export type RecordToolName = keyof typeof RECORD_TOOL_DEFINITIONS;

export type RecordToolArgs<T extends RecordToolName> = z.infer<
  (typeof RECORD_TOOL_DEFINITIONS)[T]['parameters']
>;

export function isRecordToolName(name: string): name is RecordToolName {
  return Object.prototype.hasOwnProperty.call(RECORD_TOOL_DEFINITIONS, name);
}

/**
 * Validates a tool call's arguments. On failure, the error is phrased for the model so it can
 * correct the call, e.g. 'Invalid arguments for searchRecords: types: Expected array, received
 * string'.
 */
export function parseRecordToolArgs<T extends RecordToolName>(
  name: T,
  args: unknown
): { success: true; args: RecordToolArgs<T> } | { success: false; error: string } {
  const result = RECORD_TOOL_DEFINITIONS[name].parameters.safeParse(args ?? {});
  if (result.success) return { success: true, args: result.data as RecordToolArgs<T> };
  const issues = result.error.issues
    .map((issue) => `${issue.path.join('.') || '(arguments)'}: ${issue.message}`)
    .join('; ');
  return { success: false, error: `Invalid arguments for ${name}: ${issues}` };
}
