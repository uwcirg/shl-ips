<script lang="ts">
  import { Row, Col } from 'sveltestrap';
  import { VERSION_STRING } from '$lib/config';
  import { getContext } from 'svelte';
  import type { Writable } from 'svelte/store';

  let mode: Writable<string> = getContext('mode');
</script>

<Row>
  <Col style="margin-top: 20px; padding: 20px; border-top: 1px solid rgb(204, 204, 204);" >
    <footer>
      This demonstration shows how to create a 
      <a
        target="_blank"
        rel="noreferrer"
        href="https://docs.smarthealthit.org/smart-health-links/user-stories"
      >
        SMART Health Link
      </a>
      for any FHIR
      <a href="https://build.fhir.org/ig/HL7/fhir-ips/" target="_blank" rel="noreferrer">
        International Patient Summary
      </a>
      document. SHLinks can be shared by copy/paste, or by presenting a QR code.
      {#if $mode === "advanced"}
        For more information, view the source code and license at
        <a href="https://github.com/uwcirg/shl-ips" target="_blank" rel="noreferrer">
          https://github.com/uwcirg/shl-ips
        </a>. {VERSION_STRING ? "Site version: " + VERSION_STRING : ""}
      {/if}
    </footer>
  </Col>
</Row>