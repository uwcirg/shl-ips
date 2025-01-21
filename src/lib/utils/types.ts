import type { Bundle, BundleEntry, CompositionSection, DocumentReference } from 'fhir/r4';

export interface SHLSubmitEvent {
  shcs: SHCFile[];
  label?: string;
  // content: Bundle;
  passcode?: string;
  exp?: number;
  patientName?: string;
}


export interface ResourceTemplateParams<T> {
  resource: T;
  entries?: BundleEntry[];
}

export interface ResourceRetrieveEvent {
  resources: Array<any> | undefined;
  sectionKey?: string;
  sectionTemplate?: CompositionSection;
  source?: string;
}
export interface SHCRetrieveEvent {
  shc: SHCFile | undefined;
  source?: string | undefined;
}
export interface IPSRetrieveEvent {
  ips: Bundle | undefined;
  source?: string | undefined;
}
export interface SOFAuthEvent {
  data: any | undefined;
}
export interface SHCFile {
  verifiableCredential: string[];
}

export interface SOFHost {
  id:string;
  name:string;
  url:string;
  clientId:string;
  note:string | undefined;
}

export interface DocumentReferencePOLST extends DocumentReference {
  pdfSignedDate?: string;
  
  isPolst?: boolean;

  isCpr?: boolean;
  doNotPerformCpr?: boolean;

  isComfortTreatments?: boolean;
  doNotPerformComfortTreatments?: boolean;
  typeComfortTreatments?: string;
  detailComfortTreatments?: string;

  isAdditionalTx?: boolean;
  doNotPerformAdditionalTx?: boolean;
  detailAdditionalTx?: string;

  isMedicallyAssisted?: boolean;
  doNotPerformMedicallyAssisted?: boolean;
  detailMedicallyAssisted?: string;
}

export type DocumentReferenceAD = DocumentReferencePOLST | DocumentReference;

export interface Language {
  lang_en: string;
  lang: string;
  code: string;
}
