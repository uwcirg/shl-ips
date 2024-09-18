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

/**
 * Options passed to the util.request function
 */
export interface FetchOptions extends RequestInit {
  /**
   * If `true` the request function will be instructed to resolve with a
   * [[CombinedFetchResult]] object that contains the `Response` object
   * and the parsed body (if any)
   */
  includeResponse?: boolean;
}


/**
 * If an `includeResponse` is set to true when calling the util.request
 * function the returned object will include the Response object and the
 * parsed body if available
 */
export interface CombinedFetchResult<T = JsonObject | string> {
  body?: T
  response: Response
} 

/**
 * The return type of the util.request function
 */
export type FetchResult = Response | JsonObject | string | CombinedFetchResult;

/**
 * Options that must contain an `url` property (String|URL).
 * A `includeResponse` boolean option might also be passed. Any other
 * properties will be passed to the underlying `fetch()` call.
 */
export interface RequestOptions extends RequestInit {
  /**
   * The URL to request
   */
  url: string | URL;

  /**
   * If set to true the request function will resolve with an object
   * like `{ body: any, response: Response }` so that users have
   * access to the response object and it's properties like headers
   * status etc.
   */
  includeResponse?: boolean;
}

// JSON objects
export interface JsonObject { [key: string]: JsonValue; }
export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive|JsonArray|JsonObject
export type JsonArray = JsonValue[]
