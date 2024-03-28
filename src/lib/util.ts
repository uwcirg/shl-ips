import * as jose from 'jose';

export const base64url = jose.base64url;

export function randomStringWithEntropy(entropy = 32): string {
  const b = new Uint8Array(entropy);
  crypto.getRandomValues(b);
  return base64url.encode(b);
}

export function toMilliseconds(hrs:number,min:number,sec:number):number {
  return (hrs*60*60+min*60+sec)*1000;
}