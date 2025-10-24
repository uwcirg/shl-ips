import type {
  Bundle,
  BundleEntry,
  Coding,
  CompositionSection,
  DocumentReference,
  Age,
  Duration,
  Patient,
  Period,
  Range,
} from "fhir/r4";
import type { Readable, Writable } from "svelte/store";
import type { User } from "oidc-client-ts";
import type { ResourceHelper } from "$lib/utils/ResourceHelper";

export interface SHLAdminParams {
  id: string;
  url: string;
  managementToken: string;
  key: string;
  files: SHLFile[];
  passcode?: string;
  exp?: number;
  flag?: string;
  label?: string;
  v?: number;
}

export interface SHLFile {
  contentType: string;
  contentHash: string;
  added?: string;
  label?: string | null;
}

export interface MutableSHLAdminParams extends Pick<SHLAdminParams, "passcode" | "exp" | "label"> {} 

export interface ConfigForServer extends MutableSHLAdminParams {
  patientId?: string;
  pin?: string;
  patientIdentifierSystem?: string;
}

export interface SHLSubmitEvent {
  shcs: SHCFile[];
  label?: string;
  // content: Bundle;
  passcode?: string;
  exp?: number;
  patientName?: string;
}

export interface ResourceHelperMap extends Record<string, ResourceHelper> {}

export interface CategorizedResourceHelperMap extends Record<string, ResourceHelperMap> {}

export interface ResourceTemplateParams<T> {
  resource: T;
  entries?: BundleEntry[];
}

export interface IOResponse {
  Code: string;
  Title: string;
  Score: number;
}
export interface NIOAutoCoderResponse {
  Industry: IOResponse[];
  Occupation: IOResponse[];
  Scheme: string;
}

export interface ResourceRetrieveEvent {
  resources: Array<any> | undefined;
  sectionKey?: string;
  sectionTemplate?: CompositionSection;
  category?: string;
  source?: string;
  sourceName?: string;
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

export interface DataCategoryConfig {
  category: string;
  component: any;
  tabTitle?: string;
  title?: string;
  description?: string;
  editable?: boolean;
  advanced?: boolean;
};

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

export interface UserDemographics {
  first?: string;
  last?: string;
  dob?: string;
  mrn?: string;
  gender?: string;
  pronouns?: Coding;
  sexCharacteristics?: Coding;
  email?: string;
  phone?: string;
  preferredLanguage?: string;
  languages?: string[];
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  religion?: Coding;
  culture?: string;
  community?: string;
}

export interface DateTimeFields {
  age?: Age;
  date?: string;
  dateTime?: string;
  duration?: Duration;
  period?: Period;
  range?: Range;
  string?: string;
}

export interface FormOption {
  label: string;
  value: string;
  subtitle?: string;
  info?: string;
}

export interface IAuthService {
  user: Writable<User | null>;
  authenticated: Writable<boolean>;
  error: Writable<any>;

  getUser(): Promise<User | null>;
  getAccessToken(): Promise<string | undefined>;
  getProfile(): Promise<any | undefined>;
  getRedirectUrl(): string;
  signinCallback(): Promise<User | undefined>;
  storeUser(user: User): void;
  login(): Promise<void>;
  renewToken(): Promise<User | null>;
  logout(): Promise<void>;
  isAuthenticated(): Promise<boolean | undefined>;
}

export interface IResourceCollection {
  resourcesByType: Writable<CategorizedResourceHelperMap>;
  selectedPatient: Writable<string>;
  patientReference: Readable<string>;
  patient: Readable<Patient | undefined>;
}
