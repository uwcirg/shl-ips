import * as shlClient from 'https://smart-health-links-demo.cirg.washington.edu/index.js';
import { verify } from 'https://smart-health-links-demo.cirg.washington.edu/shc-decoder.js';
import { update } from "./assets/js/renderIPS.js";

const shl = window.location.hash.match(/shlink:\/.*/)?.[0];
if (shl) {
    retrieve()
}

async function retrieve(){
    const recipient = "WA Verify+ IPS Viewer";

    let passcode;
    const needPasscode = shlClient.flag({ shl}).includes('P');
    if (needPasscode) {
        passcode = prompt("Enter passcode for SMART Health Link");
    }

    const retrieved = await shlClient.retrieve({
        shl,
        passcode,
        recipient
    });

    const decoded = await Promise.all(retrieved.shcs.map(verify));
    const data = decoded[0].fhirBundle

    $('#ipsInput').val(JSON.stringify(data, null, 2));
    update(data);
}