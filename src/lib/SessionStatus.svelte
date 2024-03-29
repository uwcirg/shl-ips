<script lang="ts">
  import { createEventDispatcher, onMount, getContext } from "svelte";
  import { OIDC_BASE, CHECK_SESSION_IFRAME } from "./config";
  import { goto } from "$app/navigation";
  import type { SOFClient } from "./sofClient";

  let sofClient: SOFClient = getContext('sofClient');
  
  const validSessionDispatch = createEventDispatcher<{'valid-session': Boolean}>();

  // Poll the OP iframe periodically
  let checkSession = setInterval(checkSessionStatus, 5000); // Adjust interval as needed

  let first = true;
  
  onMount(() => {
    // Listen for messages from OP iframe
    window.addEventListener('message', processStatus);
    // Check session on load
    // checkSessionStatus();
  });

  function checkSessionStatus() {
    var opIframe = document.getElementById('opIframe');
    var message = `${sofClient.getClient().getState('clientId')} ${sofClient.getClient().getState('tokenResponse.session_state')}`;
    // Send message to OP iframe
    opIframe?.contentWindow.postMessage(message, OIDC_BASE);
  }

  function processStatus(event: any) {
    if (event.origin === OIDC_BASE) {
      var data = event.data;
      if (data === 'changed') {
        console.log('Session state changed.');
        try {
          sofClient.getClient().refresh();
        } catch (e) {
          console.error(e);
          goto('/logout');
        }
      } else if (data === 'error') {
        goto('/logout');
      }
      if (first) {
        first = false;
        validSessionDispatch('valid-session', true);
      }
    }
  }
</script>

<iframe title="Check Session Status" id="opIframe" src={CHECK_SESSION_IFRAME} style="display:none;"></iframe>
