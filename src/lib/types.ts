export type Bundle = any;
export interface SHLSubmitEvent {
  shcs: SHCFile[];
  label?: string;
  // content: Bundle;
  passcode?: string;
  exp?: number;
  patientName?: string;
}

export interface ResourceRetrieveEvent {
  resources: Array<any> | undefined;
  source?: string | undefined;
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
