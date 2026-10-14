// import fetch from 'node-fetch';
import { json } from '@sveltejs/kit';

export const GET = async ({ request, url }: { request: Request; url: URL; }) => {
  let pid = url.searchParams.get("pid");
  let base = `https://ihe-nimbus.epic.com/Interconnect-FHIR-Open/api/fhir/R4`;

  let queries = [
    `${base}/Patient/${pid}`,
    `${base}/Device?patient=${pid}`,
    `${base}/DeviceUseStatement?patient=${pid}`,
    `${base}/DiagnosticReport?patient=${pid}`,
    `${base}/Procedure?patient=${pid}`,
    `${base}/Observation?patient=${pid}&category=laboratory`,
    `${base}/Observation?patient=${pid}&category=sdoh`,
    `${base}/Observation?patient=${pid}&category=social-history`,
    `${base}/Observation?patient=${pid}&category=vital-signs`,
    `${base}/ImmunizationRecommendation?patient=${pid}`,
    `${base}/Goal?patient=${pid}`,
    `${base}/Flag?patient=${pid}`,
    `${base}/CarePlan?patient=${pid}&category=care-path`,
    `${base}/ClinicalImpression?patient=${pid}`,
  ];

  let results = await Promise.allSettled(
    queries.map(async (query) => {
      let response = await fetch(query, {
        method: "GET",
        headers: {
          "Epic-Client-ID": "c11e3b86-a849-427a-b661-11fe6cdf5df7",
          "Accept": "application/fhir+json"
        }
      });
      let textContent = await response.text();
      let content;
      try {
        content = await JSON.parse(textContent);
      } catch (e) {
        console.log(`Error parsing response: ${query} ${response.status} ${textContent}`);
      }
      return content;
    })
  );

  let test = await fetch(`${base}/Procedure?patient=${pid}`, {
    method: "GET",
    headers: {
      "Epic-Client-ID": "c11e3b86-a849-427a-b661-11fe6cdf5df7",
      "Accept": "application/fhir+json"
    }
  });
  let textContent = await test.text();
  let testcontent;
  try {
    testcontent = await JSON.parse(textContent);
    console.log(`Procedure stuff: ${textContent}`);
  } catch (e) {
    console.log(`Error parsing response: Procedure ${test.status} ${textContent}`);
  }

  let errors = results.flatMap((result) => {
    if (result.status === "rejected") {
      return result.reason;
    }
  });
  console.log(errors);

  let content = results.flatMap((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
  })
  .filter((r) => r && r.resourceType !== "OperationOutcome")
  .map((r) => r.resourceType === "Bundle" ? r.entry : r).flat()
  .map((r) => { return { resource: r.resource ?? r } });
  let bundle = { resourceType: "Bundle", type: "searchset", entry: content };

  return json(bundle);
};
