<script>
  import { OIDC_BASE, CHECK_SESSION_IFRAME } from "./config";
  function checkSessionStatus() {
    var opIframe = document.getElementById('opIframe');
    var message = {
      type: 'checkSession'
    };
    // Send message to OP iframe
    opIframe.contentWindow.postMessage(message, OIDC_BASE);
  }

  // Poll the OP iframe periodically
  setInterval(checkSessionStatus, 5000); // Adjust interval as needed

  // Listen for messages from OP iframe
  window.addEventListener('message', function(event) {
    if (event.origin === OIDC_BASE) {
      var data = event.data;
      if (data && data.type === 'sessionStatus') {
        // Session status received from OP iframe
        var sessionState = data.sessionState;
        if (sessionState === 'logged_out') {
          // Update session state in RP accordingly
          console.log('User logged out');
          // Perform logout actions or redirect to logout page
        } else if (sessionState === 'unknown') {
          // Update session state in RP accordingly
          console.log('User session status: unknown');
          // Perform actions based on unknown session status
        } else if (sessionState === 'loggedin') {
          // Update session state in RP accordingly
          console.log('User session status: logged in');
          // Perform actions based on logged in session status
        } else if (sessionState === 'unchanged') {
          // No change in session state on the OP side
          console.log('Session state unchanged');
          // Perform actions based on unchanged session status
        }
      }
    }
  });
</script>

<iframe title="Check Session Status" id="opIframe" src={CHECK_SESSION_IFRAME} style="display:none;"></iframe>
