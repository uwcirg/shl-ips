import * as shlClient from 'https://smart-health-links-demo.cirg.washington.edu/index.js';
import { verify } from 'https://smart-health-links-demo.cirg.washington.edu/shc-decoder.js';
import { prepareSHLContents } from "./renderIPS.js";

const shl = window.location.hash.match(/shlink:\/.*/)?.[0];
if (shl) {
    try {
        retrieve()
    } catch (e) {
        console.error("Unable to load SHL: " + e);
        $("#error").html("There was a problem loading this SMART Health Link. Please ensure the link is active before trying again.");
        $("#status").hide();
        $("#ips-loader").hide();
    }
}

async function retrieve(){
    const recipient = "WA Verify+ IPS Viewer";

    let passcode;
    const needPasscode = shlClient.flag({ shl }).includes('P');
    if (needPasscode) {
        passcode = prompt("Enter passcode for SMART Health Link");
    }
    $('#status').text("Retrieving contents...");
    let retrieveResult;
    try {
        retrieveResult = await shlClient.retrieve({
            shl,
            passcode,
            recipient
        });
    } catch (e) {
        // Retrieval succeeded, but there was an error parsing files, etc.
        console.log(e);
        throw Error("Content parsing error");
    }

    if ("error" in retrieveResult) {
        let errorMsg = "";
        if (retrieveResult.status) {
            if (retrieveResult.status === 404) {
                // Couldn't find the shl, or it's been deactivated
                const managerLink = `<a href="${new URL(import.meta.url).origin}/view/${shlClient.id({ shl })}">Manage or reactivate it here</a>`;
                errorMsg = `<p>The requested SHL does not exist or has been deactivated.</p><p>Are you the owner of this link? ${managerLink}</p>`;
            } else if (retrieveResult.status === 401) {
                // Failed the password requirement
                while (retrieveResult.status === 401) {
                    passcode = prompt(`Enter passcode for SMART Health Link ${retrieveResult.error.remainingAttempts !== undefined ? "\nAttempts remaining: "+retrieveResult.error.remainingAttempts : ""}`);
                    try {
                        retrieveResult = await shlClient.retrieve({
                            shl,
                            passcode,
                            recipient
                        });
                    } catch {
                        // Retrieval succeeded, but there was an error parsing files etc.
                        console.log(e);
                        throw Error("Content parsing error");
                    }
                }
                if (!retrieveResult.ok) {
                    const managerLink = `<a href="${new URL(import.meta.url).origin}/view/${shlClient.id({ shl })}">Manage or reactivate it here</a>`;
                    errorMsg = `<p>The requested SHL has been deactivated due to too many failed password attempts.</p><p>Are you the owner of this link? ${managerLink}</p>`;
                }
            } else {
                errorMsg = retrieveResult.error;
            }
        }
        $("#error").html(`${errorMsg}`);
        $("#ips-loader").hide();
        return;
    }
    const decoded = await Promise.all(retrieveResult.shcs.map(verify));
    const data = decoded.map((e) => e.fhirBundle);
    prepareSHLContents(data);
}
