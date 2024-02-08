<script lang="ts">
    import * as jose from 'jose';
    import * as pako from 'pako';
    import { createEventDispatcher, onMount } from 'svelte';
    import FetchSoFLTT from './FetchSoFLTT.svelte';

    import issuerKeys from './issuer.private.jwks.json';
    import type { SHCFile,
      Bundle,
      IPSRetrieveEvent,
      SHLSubmitEvent} from './types';

    const shlDispatch = createEventDispatcher<{ 'shl-submitted': SHLSubmitEvent }>();
    let submitting = false;
    let fetchError = "";

    let ipsResult: IPSRetrieveEvent = {
      ips: undefined
    }

    let shcsToAdd: SHCFile[] = [];

    let label = 'Let’s Talk Tech Choices Summary (' + new Date().toISOString().slice(0, 10) + ')';
    let expiration: number | null = -1;
    let passcode = "";

    onMount(() => {

    });

    async function uploadRetrievedIPS(details: IPSRetrieveEvent) {
      try {
        submitting = true;
        ipsResult = details;
        if (ipsResult.ips) {
          shcsToAdd.unshift(await packageSHC(ipsResult.ips));
          submitSHL();
        }
      } catch (e) {
        submitting = false;
        console.log('Failed', e);
        fetchError = "Error submitting IPS";
      }
    }
    
    function isSHCFile(object: any): object is SHCFile {
      return 'verifiableCredential' in object;
    }

    async function packageSHC(content:SHCFile | Bundle | undefined): Promise<SHCFile> {
        if (content != undefined && isSHCFile(content) && content.verifiableCredential) {
          return content;
        }

        const shc = await signJws(content);

        return { verifiableCredential: [shc] };
    }

    async function submitSHL() {
      return shlDispatch('shl-submitted', {
        shcs: shcsToAdd,
        label,
        passcode: passcode ?? undefined,
        exp: expiration && expiration > 0 ? new Date().getTime() / 1000 + expiration : undefined
      });
    }

    const exampleSigningKey = jose.importJWK(issuerKeys.keys[0]);
    async function signJws(payload: unknown) {
        const fields = { zip: 'DEF', alg: 'ES256', kid: issuerKeys.keys[0].kid };
        const body = pako.deflateRaw(
            JSON.stringify({
                iss: 'https://spec.smarthealth.cards/examples/issuer',
                nbf: new Date().getTime() / 1000,
                vc: {
                    type: ['https://smarthealth.cards#health-card'],
                    credentialSubject: {
                        fhirVersion: '4.0.1',
                        fhirBundle: payload
                    }
                }
            })
        );

        const signed = new jose.CompactSign(body)
        .setProtectedHeader(fields)
        .sign(await exampleSigningKey);
        return signed;
    }
</script>

<FetchSoFLTT
  on:ips-retrieved={ async ({ detail }) => { uploadRetrievedIPS(detail) } }>
</FetchSoFLTT>
