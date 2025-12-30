<script lang="ts">
  import { Row, Col } from '@sveltestrap/sveltestrap';
  import { VERSION_STRING } from '$lib/config/config';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';

  let mode: Writable<string> = getContext('mode');
</script>

<Row>
  <Col style="margin-top: 20px; padding: 20px; border-top: 1px solid rgb(204, 204, 204);" >
    <footer>
      <p>
        This system lets an individual gather their health data from different sources, and create 
        one or more health summaries which can be shared using secure <a
          href="https://docs.smarthealthit.org/smart-health-links/user-stories"
          target="_blank"
          rel="noreferrer"
        >
          SMART Health Links (SHL)
        </a>, either as a web address or a QR code.
        The health data are organized as <a
          href="https://build.fhir.org/ig/HL7/fhir-ips/"
          target="_blank"
          rel="noreferrer"
        >
          International Patient Summary
        </a> documents using the HL7 FHIR standard.
      </p>
      <h6 class="info-header">{VERSION_STRING ? "App version: " + VERSION_STRING : ""}</h6>
    </footer>
  </Col>
</Row>