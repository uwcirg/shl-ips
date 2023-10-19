export type Bundle = unknown;
export interface SHLSubmitEvent {
  shcs: SHCFile[];
  label?: string;
  content: Bundle;
  exp?: number;
}

export interface ResourceRetrieveEvent {
  resources: Array<any> | undefined;
}
export interface SHCRetrieveEvent {
  shc: SHCFile | Bundle | undefined;
}
export interface IPSRetrieveEvent {
  ips: Bundle;
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
