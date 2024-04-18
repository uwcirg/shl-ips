<script lang="ts">
  import { onMount, getContext } from "svelte";
  import {
    OIDC_BASE,
    CHECK_SESSION_IFRAME,
    BACKUP_INACTIVITY_TIMEOUT } from "./config";
  import { goto } from "$app/navigation";
  import type { SOFClient } from "./sofClient";

  let sofClient: SOFClient = getContext('sofClient');

  // Poll the OP iframe periodically
  let checkSession = setInterval(checkSessionStatus, 5000);

  let validatingSession = true;
  let sessionCheckValid: boolean;
  
  onMount(() => {
    // Listen for messages from OP iframe
    window.addEventListener('message', processStatus);
    // Check session status on iframe load
    let iframe = document.getElementById('opIframe');
    iframe?.addEventListener('load', () => {
      checkSessionStatus();
    });
    // Check status as soon as the tab is refocused
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === "visible") {
        checkSessionStatus();
      }
    });
  });

  function checkSessionStatus() {
    var opIframe = document.getElementById('opIframe');
    var clientId = sofClient.getClient().getState('clientId');
    var sessionId = sofClient.getClient().getState('tokenResponse.session_state');
    var message = `${clientId} ${sessionId}`;
    // Send message to OP iframe
    opIframe?.contentWindow?.postMessage(message, OIDC_BASE);
  }

  let backupInactivityTimer: NodeJS.Timeout | undefined;
  function resetBackupInactivityTimer() {
    if (backupInactivityTimer !== undefined) {
        clearTimeout(backupInactivityTimer);
      }
      backupInactivityTimer = undefined;
      backupInactivityTimer = setTimeout(() => goto('/logout'), BACKUP_INACTIVITY_TIMEOUT);
  }
  function onVisible_resetBackupInactivityTimer() {
    if (document.visibilityState === "visible") {
      resetBackupInactivityTimer();
    }
  }

  async function processStatus(event: any) {
    if (event.origin === OIDC_BASE) {
      var data = event.data;
      if (validatingSession || (sessionCheckValid !== undefined && !sessionCheckValid)) {
        // Don't check status if it's only been erroring, as in Safari w/o 3p cookies
        // If check has been 'error' but is now something else, change state to valid
        sessionCheckValid = (data !== 'error');
        if (validatingSession && !sessionCheckValid) {
          // Check has only errored, initialize timeout (or manual logout)
          resetBackupInactivityTimer();
          document.addEventListener('click', resetBackupInactivityTimer);
          document.addEventListener('scroll', resetBackupInactivityTimer);
          document.addEventListener('visibilitychange', onVisible_resetBackupInactivityTimer);
        }
        validatingSession = false;
      }
      if (sessionCheckValid) {
        // If check has been valid at some point, base action on result
        // Clean up timeout and listeners if they were added before
        checkSession = undefined;
        document.removeEventListener('click', resetBackupInactivityTimer);
        document.removeEventListener('scroll', resetBackupInactivityTimer);
        document.removeEventListener('visibilitychange', onVisible_resetBackupInactivityTimer);

        if (data === 'changed') {
          try {
            let res = await sofClient.getClient().refresh();
            if (!sofClient?.getClient()?.getState("tokenResponse.access_token")) {
              throw Error("Unable to refresh token after session state change. Logging out.");
            }
          } catch (e) {
            console.error(e);
            goto('/logout');
          }
        } else if (data === 'error') {
          goto('/logout');
        }
      } else {
        console.warn('Unable to verify session state. You will be logged out automatically after 15 minutes of inactivity.');
      }
    }
  }
</script>

<iframe title="Check Session Status" id="opIframe" src={CHECK_SESSION_IFRAME} style="display:none;"></iframe>
