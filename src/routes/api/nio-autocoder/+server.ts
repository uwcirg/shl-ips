// import fetch from 'node-fetch';
import { json } from '@sveltejs/kit';
import {
  AUTOCODER_API_KEY
} from '$lib/server/config';

export const GET = async ({ request, url }: { request: Request; url: URL; }) => {
  let occupation = url.searchParams.get("o");
  let industry = url.searchParams.get("i");
  let api = "https://apistg.cdc.gov/nioautocoder/1.0.0/iocode?n=6";
  let endpoint = `${api}${occupation ? "&o="+occupation : ""}${industry ? "&i="+industry : ""}`;

  let response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Ocp-Apim-Subscription-Key": AUTOCODER_API_KEY
    }
  });

  let content = await response.json();
  console.log(content);
  console.log(response.status);

  return json(content);
};
