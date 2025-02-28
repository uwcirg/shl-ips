// import fetch from 'node-fetch';
import { json, error, Request } from '@sveltejs/kit';
import {
  AUTOCODER_API_KEY,
  SERVER_API_BASE
} from '$lib/server/config';

export const GET = async ({ request, url }: { request: Request; url: URL; }) => {

  // console.log('Checking auth');
  // const auth = request.headers.get('Authorization');
  // if (!auth || !auth.startsWith('Bearer ')) {
  //   console.log('Unauthorized');
  //   return error(401, { message: "Unauthorized" });
  // }
  // const authorized = await fetch(`${SERVER_API_BASE}/authcheck`, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     Authorization: auth,
  //   },
  // });
  // if (!authorized.ok) {
  //   console.log('Authorization check failed');
  //   console.log(authorized.status, authorized.statusText, await authorized.text());
  //   return error(401, { message: 'Authorization check failed' });
  // }

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
