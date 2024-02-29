<script lang="ts">
  import QRCode from 'qrcode';
  import { getContext } from 'svelte';
  import {
    Button,
    Card,
    CardHeader,
    CardBody,
    CardFooter,
    CardImg,
    CardText,
    Col,
    FormGroup,
    Icon,
    Input,
    Label,
    Modal,
    ModalBody,
    ModalHeader,
    ModalFooter,
    Row
  } from 'sveltestrap';
  import { fade } from 'svelte/transition';
  import { goto } from '$app/navigation';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams, SHLClient } from './managementClient';

  let open = false;
  const toggle = () => (open = !open);

  let shlStore: Writable<SHLAdminParams> = getContext('shlStore');
  let shlClient: SHLClient = getContext('shlClient');

  let copyNotice = '';

  let href: Promise<string>;
  let qrCode: Promise<string>;
  let exp: Date;
  let today: Date;
  let expDisplay: string;
  let inactive = false;

  $: {
    href = getUrl($shlStore);
  }

  $: {
    qrCode = href.then((r) => QRCode.toDataURL(r, { errorCorrectionLevel: 'M' }))
  }

  $: {
    let rawExp =  $shlStore.exp ?? $shlStore.config?.exp;
    if (rawExp) {
      exp = new Date(rawExp * 1000);
      today = new Date();
      expDisplay = exp.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  }

  async function getUrl(shl: SHLAdminParams) {
    let shlMin = {
      id: shl.id,
      managementToken: shl.managementToken,
      encryptionKey: shl.encryptionKey,
      files: []
    };
    return await shlClient.toLink(shlMin);
  }

  async function copyShl() {
    let copyNoticePrev = copyNotice;
    copyNotice = '...';
    let text = await getUrl($shlStore);
    navigator.clipboard.writeText(text);
    copyNotice = 'Copied!';
    setTimeout(() => {
      copyNotice = copyNoticePrev;
    }, 1000);
  }

  async function deactivateShl() {
    shlClient.deleteShl($shlStore);
    toggle();
    // TODO: Implement post-deactivation flow
    goto('/share');
  }

  async function renewShl() {}
</script>
<div transition:fade>
<Row class="justify-content-center">
  <Col sm="8">
    <!-- <h2>{$shlStore.label}</h2> -->
    <h2>Let's Talk Tech Choices Report (November 29, 2023)</h2>
    <h3>Share Report</h3>
    <p>There are 2 ways to share this electronically.</p>
    <ol>
      <li>
        <strong>Email it:</strong> You can copy a link and paste it into an email to send.
        <ul>
          <li>First, to copy the link, click the copy button below:</li>
          <Row class="justify-content-center">
            <Col xs="5">
              <Button size="sm" color="success" style="width:100px !important" on:click={copyShl} disabled={!!copyNotice}>
                <Icon name="clipboard" />
                {#if copyNotice}
                  {copyNotice}
                {:else}
                  Copy Link
                {/if}
              </Button>
            </Col>
          </Row>
          <li>
            Then, open your email and start a new message to the person you want to send it to.
          </li>
          <li>
            Paste the link into the body of the email. Here’s how: After you have clicked the button
            above, right-click, then choose “Paste” from the pop-up menu. Or, if you’re using a PC,
            press the Ctrl and V buttons at the same time. On a Mac, press Command and V.
          </li>
          <li>
            Send the email. The person you send it to will receive the link to be able to see your
            saved Choices Report.
          </li>
        </ul>
      </li>
      <li>
        <strong>Share a QR code:</strong> Point your phone’s camera at the QR code so that it's clearly
        visible within your smartphone's screen. The phone automatically scans the code. On some QR readers,
        you have to tap a button to scan the code. If necessary, tap the button. Your smartphone
        reads the code and navigates to a page showing your Choices Summary.
      </li>
    </ol>
    <Row class="justify-content-center mx-4" cols={{ xs: 1, md: 2 }}>
      <Col>
        <Row class="justify-content-center">
          <Card class="mb-2 p-0" color="light">
            <CardHeader>
              <strong>
                {#if expDisplay}
                  {#if exp > today}
                    Expires {expDisplay}
                  {:else}
                    <span class="text-danger">Expired {expDisplay}</span>
                  {/if}
                {/if}
              </strong>
            </CardHeader>
            <CardBody>
              <CardText>
                {#await qrCode then qrImage}
                  <CardImg class="img-fluid" alt="QR Code for SHL" src={qrImage} />
                  <CardImg
                    style="position: absolute;
              background: #325c33;
              width: 110px;
              height: 27px;
              left: calc(50% - 55px);
              top: calc(50% - 1em);
              border: 5px solid #325c33;
              box-sizing: border-box;"
                    class="logo"
                    alt="Let's Talk Tech Logo"
                    src="/img/ltt-logo.svg"
                  />
                  <!-- 
                  <img class="qr" alt="QR Code for SHL" src={dataUrl} />
                  <img class="logo" alt="Let's Talk Tech Logo" src='/img/ltt-logo.svg' />
                </p> -->
                {/await}
              </CardText>
            </CardBody>
            <CardFooter>
              {#await href then href}
                <Row class="justify-content-center mx-auto">
                  <Button size="sm" color="success" {href} target="_blank">
                    <Icon name="box-arrow-up-right" /> View Summary
                  </Button>
                </Row>
              {/await}
            </CardFooter>
          </Card>
        </Row>
        {#if exp <= today}
          <Row class="justify-content-center mb-2">
            Your link has expired. Click here to create a new link:
          </Row>
        {/if}
        <Row class="justify-content-center mx-1 mt-1">
          <Button size="sm" style="max-width:266px" on:click={toggle} color="danger">Recreate Summary Link</Button>
          <Modal isOpen={open} backdrop="static" {toggle}>
            <ModalHeader {toggle}>Recreate Summary Link</ModalHeader>
            <ModalBody>
              Those with the old link to your "{$shlStore.label}" will no longer be able to view its contents. A new link to your Summary will be generated that you may share.
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" on:click={toggle}>Cancel</Button>
              <Button color="danger" on:click={deactivateShl}>Confirm</Button>
            </ModalFooter>
          </Modal>
        </Row>
      </Col>
    </Row>
    <Row class="mx-1 mt-4">
      <p><strong>If you have any questions or problems using the system, please get in touch at ?clara@email.com? for assistance.</strong></p>
    </Row>
  </Col>
</Row>
</div>

<style>
  img.qr {
    height: 100%;
  }
  p.logo {
    position: relative;
    width: 250px;
    height: 250px;
  }
  .logo {
    position: absolute;
    background: #325c33;
    width: 110px;
    height: 27px;
    /* padding: 2px; */
    left: calc(50% - 55px);
    top: calc(50% - 2em);
    border: 5px solid #325c33;
    box-sizing: border-box;
  }
  :global(.shlbutton) {
    width: 300px !important;
  }
  :global(.shlbutton input, .shlbutton button) {
    width: 100%;
    display: inline-block;
  }
  :global(div.card) {
    max-width: 300px;
  }
  :global(.card-title) {
    font-size: 1em;
    font-weight: bold;
  }

  li {
    margin-bottom: 5px;
    margin-top: 5px;
  }

  /* Style for the ordered list */
  ol > li::marker {
    font-weight: bold;
  }

  /* Style for the secondary-level bulleted items */
  ul {
    list-style-type: disc; /* Use filled-in bullet points */
    margin-top: 0; /* Remove default margin */
    margin-bottom: 10px; /* Add some spacing between lists */
    padding-left: 20px; /* Indent the bullets */
  }
</style>
