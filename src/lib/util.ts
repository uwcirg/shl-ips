import * as jose from 'jose';
import HttpError from "./HttpError";
import type { FetchOptions, FetchResult, JsonObject } from './types';

export const base64url = jose.base64url;

export function randomStringWithEntropy(entropy = 32): string {
  const b = new Uint8Array(entropy);
  crypto.getRandomValues(b);
  return base64url.encode(b);
}

export async function base64toBlob(base64:string, type="application/octet-stream") {
  let result = await fetch(`data:${type};base64,${base64}`);
  return window.URL.createObjectURL(await result.blob());
}

/**
 * The cache for the `getAndCache` function
 */
const cache: Record<string, any> = {};

/**
 * Used in fetch Promise chains to reject if the "ok" property is not true
 */
export async function checkResponse(resp: Response): Promise<Response> {
    if (!resp.ok) {
        const error = new HttpError(resp);
        await error.parse();
        throw error;
    }
    return resp;
}

/**
 * Used in fetch Promise chains to return the JSON version of the response.
 * Note that `resp.json()` will throw on empty body so we use resp.text()
 * instead.
 */
export function responseToJSON(resp: Response): Promise<object|string> {
    return resp.text().then(text => text.length ? JSON.parse(text) : "");
}

/**
 * This is our built-in request function. It does a few things by default
 * (unless told otherwise):
 * - Makes CORS requests
 * - Sets accept header to "application/json"
 * - Handles errors
 * - If the response is json return the json object
 * - If the response is text return the result text
 * - Otherwise return the response object on which we call stuff like `.blob()`
 */
export function request<T = FetchResult>(
    url: string | Request,
    requestOptions: FetchOptions = {}
): Promise<T>
{
    const { includeResponse, ...options } = requestOptions;
    return fetch(url, {
        mode: "cors",
        ...options,
        headers: {
            accept: "application/json",
            ...lowerCaseKeys(options.headers)
        }
    })
    .then(checkResponse)
    .then((res: Response) => {
        const type = res.headers.get("content-type") + "";
        if (type.match(/\bjson\b/i)) {
            return responseToJSON(res).then(body => ({ res, body }));
        }
        if (type.match(/^text\//i)) {
            return res.text().then(body => ({ res, body }));
        }
        return { res };
    })
    .then(({res, body}: {res:Response, body?: JsonObject|string}) => {

        // Some servers will reply after CREATE with json content type but with
        // empty body. In this case check if a location header is received and
        // fetch that to use it as the final result.
        if (!body && res.status == 201) {
            const location = res.headers.get("location");
            if (location) {
                return request(location, { ...options, method: "GET", body: null, includeResponse });
            }
        }

        if (includeResponse) {
            return { body, response: res };
        }

        // For any non-text and non-json response return the Response object.
        // This to let users decide if they want to call text(), blob() or
        // something else on it
        if (body === undefined) {
            return res;
        }

        // Otherwise just return the parsed body (can also be "" or null)
        return body;
    });
}

/**
 * Makes a request using `fetch` and stores the result in internal memory cache.
 * The cache is cleared when the page is unloaded.
 * @param url The URL to request
 * @param requestOptions Request options
 * @param force If true, reload from source and update the cache, even if it has
 * already been cached.
 */
export function getAndCache(url: string, requestOptions?: RequestInit, force: boolean = process.env.NODE_ENV === "test"): Promise<any> {
    if (force || !cache[url]) {
        cache[url] = request(url, requestOptions);
        return cache[url];
    }
    return Promise.resolve(cache[url]);
}

export function assert(condition: any, message: string): asserts condition {
    if (!(condition)) {
        throw new Error(message)
    }
}

export function lowerCaseKeys<T=Record<string, any> | any[] | undefined>(obj: T): T {
    
  // Can be undefined to signal that this key should be removed
  if (!obj) {
      return obj as T
  }

  // Arrays are valid values in case of recursive calls
  if (Array.isArray(obj)) {
      return obj.map(v => v && typeof v === "object" ? lowerCaseKeys(v) : v) as unknown as T;
  }

  // Plain object
  let out: Record<string, any> = {};
  Object.keys(obj).forEach(key => {
      const lowerKey = key.toLowerCase()
      const v = (obj as Record<string, any>)[key]
      out[lowerKey] = v && typeof v == "object" ? lowerCaseKeys(v) : v;
  });
  return out as T;
}
