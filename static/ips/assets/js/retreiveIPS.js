import * as shlClient from 'https://shl-client.fl.dlorigan.dev.cirg.uw.edu/index.js';
import { verify } from 'https://shl-client.fl.dlorigan.dev.cirg.uw.edu/shc-decoder.js';
import { prepareSHLContents } from "./renderIPS.js";

const shl = window.location.hash.match(/shlink:\/.*/)?.[0];
if (shl) {
    try {
        retrieve()
    } catch (e) {
        console.error("Unable to retrieve SHL: " + e);
        
    }
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
    const data = decoded.map((e) => e.fhirBundle);
    prepareSHLContents(data);
}
