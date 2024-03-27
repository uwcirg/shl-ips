import * as jose from 'jose';

export const base64url = jose.base64url;

export function randomStringWithEntropy(entropy = 32): string {
  const b = new Uint8Array(entropy);
  crypto.getRandomValues(b);
  return base64url.encode(b);
}

export async function fetchEnvData() {
  if (window["appConfig"] && Object.keys(window["appConfig"]).length) {
    console.log("Window config variables added. ");
    return;
  }
  let result = await fetch(`/env.json`);
  if (result.status !== 200) {
    console.log("Request failed!");
    return;
  }
  let envObj = await result.json();
  window["appConfig"] = {};
    //assign window process env variables for access by app
    //won't be overridden when Node initializing env variables
    for (var key in envObj) {
      if (!window["appConfig"][key]) {
        window["appConfig"][key] = envObj[key];
      }
    }
}

export async function getEnv(key: string): Promise<string | undefined> {

  if (!("appConfig" in window)) {
    await fetchEnvData();
  }
  //window application global variables
  if (window["appConfig"] && window["appConfig"][key])
    return window["appConfig"][key];
  const nodeEnvDefined = typeof process !== "undefined" && process.env;
  //enviroment variables as defined in Node
  if (nodeEnvDefined && process.env[key]) return process.env[key];
  //environment variables as accessed in Vite
  const viteEnvDefined = typeof import.meta.env !== "undefined" && import.meta.env;
  const env = import.meta.env;
  if (viteEnvDefined && env[key]) return env[key];
  return "";
}
