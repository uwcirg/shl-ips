// Client-safe entry point. Server-only code lives in ./server and is exported as
// 'odh-autocoder/server'.
export * from './fhir/index.js';
export { NOT_CODED, type AutocoderResponse, type CodingMode, type IOResponse } from './types.js';
