export type Bundle = any;
export interface SHLSubmitEvent {
  shcs: SHCFile[];
  label?: string;
  // content: Bundle;
  passcode?: string;
  exp?: number;
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

export class ResourceHelper {
  tempId: string;
  original_resource: any;
  simple_resource: any;
  resource: any;
  include: boolean = true;

  // Constructor
  constructor(resource:any) {
    this.original_resource = resource;
    this.simple_resource = this.simplify(resource);
    this.resource = resource;
    this.tempId = this.hash(this.simple_resource);
  }

  hash(value:any) {
    return JSON.stringify(value);
    // return crypto.createHash('sha1').update(value).digest('hex');
  }

  simplify(resource:any) {
    let simpleResource = JSON.parse(JSON.stringify(resource));
    delete simpleResource.id;
    delete simpleResource.meta;
    delete simpleResource.text;
    // delete simpleResource.patient;
    // delete simpleResource.subject;
    // delete simpleResource.encounter;
    // delete simpleResource.requester;
    return this.removeEntries(simpleResource, "reference");
  }

  removeEntries(obj:any, key:string) {
    if (typeof obj === "object") {
      for (let k in obj) {
        if (k === key) {
          delete obj[k];
        } else {
          obj[k] = this.removeEntries(obj[k], key);
        }
      }
    } else if (obj instanceof Array) {
      for (let i=0; i < obj.length; i++) {
        obj[i] = this.removeEntries(obj[i], key);
      }
    }
    return obj;
  }
}
