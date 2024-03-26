<script lang="ts">
  import QRCode from 'qrcode';
  import { getContext, setContext } from 'svelte';
  import {
    Accordion,
    AccordionItem,
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
    location.reload();
  }

  let pasteHeader = "Click here to see how";
  function updatePasteHeader({ detail }) {
    pasteHeader = detail ? "Click here to close" : "Click here to see how";
  }
  let qrHeader = "Click here to see how";
  function updateQRHeader({ detail }) {
    qrHeader = detail ? "Click here to close" : "Click here to see how";
  }
</script>
<div transition:fade>
<Row class="justify-content-center">
  <Col sm="8">
    <h2>{$shlStore.label?.split('(')[0]}<span class="date-display">{"("+$shlStore.label?.split('(')[1]}</span></h2>
    <h3>Share Report</h3>
    <p>There are 2 ways to share this electronically.</p>
    <ol>
      <li>
        <strong>Email it:</strong> You can copy a link and paste it into an email to send.
        <ul>
          <li>First, to copy the link, click the copy button below:</li>
          <li style="list-style-type: none;">
            <Row>
              <Col xs="auto" class="mb-2">
                <Button size="sm" color="primary" style="width:130px !important" on:click={copyShl} disabled={!!copyNotice}>
                  <Icon name="clipboard" />
                  {#if copyNotice}
                    {copyNotice}
                  {:else}
                    Copy Link
                  {/if}
                </Button>
              </Col>
              <Col xs="auto">
                {#await href then href}
                <Button size="sm" color="primary" style="width:130px !important" {href} target="_blank">
                  <Icon name="box-arrow-up-right" /> Open Report
                </Button>
                {/await}
              </Col>
            </Row>
          </li>
          <li>
            Then, open your email and start a new message to the person you want to send it to.
          </li>
          <li>
            Paste the link into the body of the email.
            <Accordion class="mt-1">
              <AccordionItem on:toggle={updatePasteHeader}>
                <h6 slot="header" class="my-2">{pasteHeader}</h6>
                <p>Here's how:</p>
                <p>After you have clicked the "Copy Link" button above, right-click, then choose “Paste” from the pop-up menu.</p>
                <p>Or, if you’re using a PC, press the Ctrl and V buttons at the same time.</p>
                <p>On a Mac, press Command and V.</p>
              </AccordionItem>
            </Accordion>
          </li>
          <li>
            Send the email. The person you send it to will receive the link to be able to see your
            saved Choices Report.
          </li>
        </ul>
      </li>
      <li>
        <strong>Share a QR code:</strong>
      </li>
      <ul>
        <li style="list-style-type: none;">
          <Accordion>
            <AccordionItem on:toggle={updateQRHeader}>
              <h6 slot="header" class="my-2">{qrHeader}</h6>
              <Row>
                <Col xs=12 md=6 style="padding-left: 0px">
                  <p>Here's how:</p>
                  <ol>
                    <li>
                      Point your phone’s camera at the QR code so that it's clearly
                      visible within your phone's camera app.
                    </li>
                    <li>
                      Your device should recognize the QR code, automatically scan it, and show a notification.
                      On some readers, you have to press a button to scan the code.
                    </li>
                    <li>
                      If necessary, press the link button.
                      Your device reads the code and navigates to a page showing your Choices Report.
                    </li>
                  </ol>
                </Col>
                <Col xs=12 md=6 style="padding-left: 0px">
                  <Col class="d-flex justify-content-center mt-2">
                    <img src="/img/qrphone.png" alt="Scan a QR Code"/>
                  </Col>
                </Col>
              </Row>
            </AccordionItem>
          </Accordion>
        </li>
      </ul>
      <li style="list-style-type: none;">
        <Row class="justify-content-center mx-4">
          <Col>
            <Row class="justify-content-center">
              <Card class="mb-2 p-0">
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
                  top: calc(50% - 2em);
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
                <CardFooter class={exp > today ? "valid" : "expired"}>
                  <strong>
                    {#if expDisplay}
                      {#if exp > today}
                        Expires {expDisplay}
                      {:else}
                        <span class="text-white">Expired {expDisplay}</span>
                      {/if}
                    {/if}
                  </strong>
                </CardFooter>
              </Card>
            </Row>
            {#if exp <= today}
              <Row class="justify-content-center mb-2">
                Your link has expired. Click here to create a new link:
              </Row>
            {/if}
            <Row class="justify-content-center mx-1 mt-1">
              <Button size="sm" style="max-width:266px" on:click={toggle} color="danger"><Icon name="arrow-repeat"></Icon> Recreate Report Link</Button>
              <Modal isOpen={open} backdrop="static" {toggle}>
                <ModalHeader {toggle}>Recreate Report Link</ModalHeader>
                <ModalBody>
                  Those with an old link to "{$shlStore.label}" will no longer be able to view its contents. A new link to your Report will be generated that you may share.
                </ModalBody>
                <ModalFooter>
                  <Button color="secondary" on:click={toggle}>Cancel</Button>
                  <Button color="danger" on:click={deactivateShl}>Confirm</Button>
                </ModalFooter>
              </Modal>
            </Row>
          </Col>
        </Row>
      </li>
    </ol>
  </Col>
</Row>
</div>

<style>
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
  :global(div.card-footer) {
    font-size: 16px;
  }
  :global(div.card-footer.valid) {
    background-color: var(--primary-color);
    color: var(--highlight-light-color);
  }
  :global(div.card-footer.expired) {
    background-color: var(--errorColor);
    color: white;
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
