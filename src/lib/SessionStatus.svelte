<script lang="ts">
  import { onMount, getContext } from "svelte";
  import { OIDC_BASE, CHECK_SESSION_IFRAME } from "./config";
  import { goto } from "$app/navigation";
  import type { SOFClient } from "./sofClient";

  let sofClient: SOFClient = getContext('sofClient');

  // Poll the OP iframe periodically
  let checkSession = setInterval(checkSessionStatus, 5000);
  
  onMount(() => {
    // Listen for messages from OP iframe
    window.addEventListener('message', processStatus);
    // Check session on load
    // checkSessionStatus();
    let iframe = document.getElementById('opIframe');
    iframe?.addEventListener('load', () => {
      // Poll the iframe on load
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
    var message = `${sofClient.getClient().getState('clientId')} ${sofClient.getClient().getState('tokenResponse.session_state')}`;
    // Send message to OP iframe
    opIframe?.contentWindow?.postMessage(message, OIDC_BASE);
  }

  async function processStatus(event: any) {
    if (event.origin === OIDC_BASE) {
      var data = event.data;
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
    }
  }
</script>

<iframe title="Check Session Status" id="opIframe" src={CHECK_SESSION_IFRAME} style="display:none;"></iframe>
