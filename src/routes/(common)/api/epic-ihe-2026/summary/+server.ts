// import fetch from 'node-fetch';
import { json } from '@sveltejs/kit';

export const GET = async ({ request, url }: { request: Request; url: URL; }) => {
  let pid = url.searchParams.get("pid");
  let base = `https://ihe-nimbus.epic.com/Interconnect-FHIR-Open/api/fhir/R4`;

  let response = await fetch(`${base}/Patient/${pid}/$summary`, {
    method: "GET",
    headers: {
      "Epic-Client-ID": "738c9ffd-8f14-4c01-9917-fb6c6610b5eb",
      "Accept": "application/fhir+json"
    }
  });

  let content = await response.json();
  console.log("In epic-ihe-2026");
  console.log(content);
  console.log(response.status);

  return json(content);
};
