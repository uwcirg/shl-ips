import * as shlClient from 'http://smart-health-links-demo.cirg.washington.edu/index.js';
import { verify } from 'https://smart-health-links-demo.cirg.washington.edu/shc-decoder.js';
import { prepareSHLContents } from "./renderIPS.js";

let data = [];
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
    data = decoded.map((e) => e.fhirBundle);
    prepareSHLContents(data);
}