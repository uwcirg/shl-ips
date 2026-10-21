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
    `${base}/Encounter?patient=${pid}`,
    `${base}/Procedure?patient=${pid}`,
    `${base}/Observation?patient=${pid}&category=laboratory`,
    `${base}/Observation?patient=${pid}&category=sdoh`,
    `${base}/Observation?patient=${pid}&category=social-history`,
    `${base}/Observation?patient=${pid}&category=vital-signs`,
    `${base}/Observation?patient=${pid}&category=observation-adi-documentation`,
    `${base}/Observation?patient=${pid}&category=labor-delivery`,
    `${base}/Observation?patient=${pid}&category=newborn-delivery`,
    `${base}/Observation?patient=${pid}&category=obstetrics-gynecology`,
    `${base}/ImmunizationRecommendation?patient=${pid}`,
    `${base}/Goal?patient=${pid}`,
    `${base}/Flag?patient=${pid}`,
    `${base}/CarePlan?patient=${pid}&category=38717003`,
    `${base}/ClinicalImpression?patient=${pid}`,
    `${base}/DocumentReference?patient=${pid}`,
  ];

  let results = await Promise.allSettled(
    queries.map(async (query) => {
      let response = await fetch(query, {
        method: "GET",
        headers: {
          "Epic-Client-ID": "738c9ffd-8f14-4c01-9917-fb6c6610b5eb",
          "Accept": "application/fhir+json",
          "Epic-User-ID": "22456",
          "Epic-User-IDType": "EXTERNAL"
        }
      });
      let textContent = await response.text();
      let content;
      if (response.status !== 200) {
        console.log(`Error fetching resource: ${query} ${response.status} ${textContent}`);
      }
      try {
        content = await JSON.parse(textContent);
        console.log(query);
        console.log(content.resourceType === 'Bundle' ? content.entry.length : content);
      } catch (e) {
        console.log(`Error parsing response: ${query} ${response.status} ${textContent}`);
      }
      return content;
    })
  );

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

  // Inline attachments of advance directive DocumentReferences (LOINC 42348-3) as base64 data
  let adDocRefs = content.filter((r) =>
    r.resource.resourceType === "DocumentReference" &&
    r.resource.category?.some((c: any) => c.coding?.some((cd: any) => cd.code === "42348-3"))
  );
  await Promise.allSettled(
    adDocRefs.flatMap((r) => (r.resource.content ?? []).map(async (c: any) => {
      let attachment = c.attachment;
      if (!attachment?.url || attachment.data) return;
      let attachmentUrl = new URL(attachment.url, `${base}/`).toString();
      let response = await fetch(attachmentUrl, {
        method: "GET",
        headers: {
          "Epic-Client-ID": "738c9ffd-8f14-4c01-9917-fb6c6610b5eb",
          "Accept": "application/fhir+json",
          "Epic-User-ID": "22456",
          "Epic-User-IDType": "EXTERNAL"
        }
      });
      if (response.status !== 200) {
        console.log(`Error fetching attachment: ${attachmentUrl} ${response.status} ${await response.text()}`);
        return;
      }
      let bytes = new Uint8Array(await response.arrayBuffer());
      let data: string;
      try {
        // Epic returns a Binary resource when Accept is fhir+json
        let binary = JSON.parse(new TextDecoder().decode(bytes));
        if (binary.resourceType !== "Binary" || !binary.data) throw new Error("not a Binary with data");
        data = binary.data;
        attachment.contentType ??= binary.contentType;
      } catch (e) {
        // Otherwise the body is the raw document
        let binaryString = "";
        for (let i = 0; i < bytes.length; i += 0x8000) {
          binaryString += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        }
        data = btoa(binaryString);
        attachment.contentType ??= response.headers.get("content-type") ?? undefined;
      }
      attachment.data = data;
      delete attachment.url;
    }))
  );

  let deviceIds = content.filter((r) => r.resource.resourceType === "Device").map((r) => r.resource.id);
  let deviceTemplate = {
    "resourceType": "DeviceUseStatement",
    "id": "example",
    "status": "active",
    "subject": {
      "reference": "Patient/example"
    },
    "device": {
      "reference": "Device/example"
    }
  };
  let deviceUseStatements = deviceIds.map((id) => {
    let deviceUseStatement = JSON.parse(JSON.stringify(deviceTemplate));
    deviceUseStatement.id = `dus-${id}`;
    deviceUseStatement.device.reference = `Device/${id}`;
    deviceUseStatement.subject.reference = `Patient/${pid}`;
    return { resource: deviceUseStatement };
  });
  content = content.concat(deviceUseStatements);
  let bundle = { resourceType: "Bundle", type: "searchset", entry: content };

  return json(bundle);
};
