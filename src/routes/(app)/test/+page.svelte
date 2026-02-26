<script lang="ts">
  import { base64url } from "$lib/utils/util";
  import { Button } from '@sveltestrap/sveltestrap';
  import { VIEWER_BASE } from '$lib/config/config';
  import { goto } from '$app/navigation';

  let newSHL = '';
  // let newshlink = '';
  let newshlink = 'shlink:/eyJ1cmwiOiJodHRwczovL2ludGVyb3AtZ2F0ZXdheS5vZGwuaW8vc2hsL2lwcy84ZjI2ZWY4Ny0yNWE2LTQ0OTQtYWFkOC02NWFjYTZjYTdlOTUvbWFuaWZlc3QiLCJrZXkiOiJCdDZubTJmWjVfZExYejdDS0hpNjlwQ1lRa25zd1BnZVQ5U2Q2X1dOWDNBIiwiZmxhZyI6IlAiLCJleHAiOjE3NzIwNTg0NTksImxhYmVsIjoiSVBTIiwidiI6MX0';
  let fetchErrors: string[] = [];
  async function createSHLOrion() {
    const baseUrl = 'https://pancanadianio.ca:10170';
    const userId = 'GE3DQMRZHE4UAU2ZKNPUC';
    // console.log('Public URL: ' + env.PUBLIC_URL);
    const url = new URL(`${baseUrl}/fhir/4.0/Patient/${userId}/$health-link-issue`);
    console.log(url);
    const shlResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        "resourceType": "Parameters",
        "parameter": [
          {
            "name": "credentialType",
            "valueUri": "http://hl7.org/fhir/uv/ips/StructureDefinition/HealthCard-IPS"
          },
          {
            "name": "passcode",
            "valueString": "4567"
          }
        ]
      })
    }).catch((e) => {
      fetchErrors.push(JSON.stringify(e.message));
      return;
    });
    if (!shlResponse) {
      fetchErrors.push('No response');
      return;
    }
    if (!shlResponse.ok) {
      fetchErrors.push(`${shlResponse.status} ${shlResponse.statusText}: ${await shlResponse.text()}` || shlResponse.statusText);
      return;
    }
    const result = await shlResponse.text();
    console.log('Created ', result);
    const resultParsed = JSON.parse(result);
    const shlink = resultParsed.parameter.find((p: any) => p.name === 'shlink').valueUri;
    const decoded = base64url.decode(shlink.split('/')[1]);
    const asString = new TextDecoder('utf-8').decode(decoded);
    console.log('New SHL: ' + asString);
    const newSHL = JSON.parse(asString);

    return shlink;
  }

</script>

<Button on:click={() => createSHLOrion()}>Test Orion Create SHL</Button>
<span>{newSHL}</span>
{#each fetchErrors as error}<span>{error}</span>{/each}
{#if newshlink}
  <Button on:click={() => goto(`${VIEWER_BASE}/ips#${newshlink}`)}>Open in Viewer</Button>
{/if}