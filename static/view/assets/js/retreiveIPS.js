import * as shlClient from 'https://smart-health-links-demo.cirg.washington.edu/index.js';
import { verify } from 'https://smart-health-links-demo.cirg.washington.edu/shc-decoder.js';
import { prepareSHLContents } from "./renderIPS.js";

const shl = window.location.hash.match(/shlink:\/.*/)?.[0];
if (shl) {
    try {
        retrieve()
    } catch (e) {
        console.error("Unable to load Report: " + e);
        $("#error").show();
        $("#status").hide();
        $("#ips-loader").hide();
    }
}

async function retrieve(){
    const recipient = "LTT Choices Report Viewer";

    let passcode;
    const needPasscode = shlClient.flag({ shl }).includes('P');
    if (needPasscode) {
        passcode = prompt("Enter passcode to view this Choices Report");
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
                // Couldn't find the shl, or it has been deactivated
                errorMsg = `<p>This link to view a Choices Report does not exist or has been deactivated.</p>`;
            } else if (retrieveResult.status === 401) {
                // Failed the password requirement
                while (retrieveResult.status === 401) {
                    passcode = prompt(`Enter passcode to view this Choices Report ${retrieveResult.error.remainingAttempts !== undefined ? "\nAttempts remaining: "+retrieveResult.error.remainingAttempts : ""}`);
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
                    errorMsg = `<p>This link to the requested Choices Report has been deactivated due to too many failed password attempts.</p><p>Are you the owner of this link? ${managerLink}</p>`;
                }
            } else {
                errorMsg = retrieveResult.error;
            }
        }
        $('#error').show();
        $("#ips-loader").hide();
        return;
    }
    const decoded = await Promise.all(retrieveResult.shcs.map(verify));
    const data = decoded.map((e) => e.fhirBundle);
    prepareSHLContents(data);
}