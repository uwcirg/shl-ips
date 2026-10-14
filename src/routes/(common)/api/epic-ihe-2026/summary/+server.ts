// import fetch from 'node-fetch';
import { json } from '@sveltejs/kit';

export const GET = async ({ request, url }: { request: Request; url: URL; }) => {
  let pid = url.searchParams.get("pid");
  let base = `https://ihe-nimbus.epic.com/Interconnect-FHIR-Open/api/fhir/R4`;

  let response = await fetch(`${base}/Patient/${pid}/$summary`, {
    method: "GET",
    headers: {
      "Epic-Client-ID": "c11e3b86-a849-427a-b661-11fe6cdf5df7",
      "Accept": "application/fhir+json"
    }
  });

  let content = await response.json();
  console.log("In epic-ihe-2026");
  console.log(content);
  console.log(response.status);

  return json(content);
};
