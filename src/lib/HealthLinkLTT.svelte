<script lang="ts">
  import QRCode from 'qrcode';
  import { getContext, setContext } from 'svelte';
  import {
    Accordion,
    AccordionItem,
    Alert,
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
    toggle();
    await shlClient.deleteShl($shlStore);
    // TODO: Implement post-deactivation flow
    location.reload();
  }

  let openedHeader = "Click here to close"
  let closedHeader = "Click here to see how on your";
  let computerHeader = `${closedHeader} computer`;
  let phoneHeader = `${closedHeader} phone`;
  function updateComputerHeader({ detail }) {
    computerHeader = updateHeader(detail, 'computer');
    if (detail) {
      phoneHeader = updateHeader(!detail, 'phone');
    }
  }
  function updatePhoneHeader({ detail }) {
    phoneHeader = updateHeader(detail, 'phone');
    if (detail) {
      computerHeader = updateHeader(!detail, 'computer');
    }
  }
  function updateHeader(detail, device: string) {
    return detail ? openedHeader : `${closedHeader} ${device}`
  }

  let qrHeaderClosed = "Click here to see how to scan a QR code";
  let qrHeader = qrHeaderClosed;
  function updateQRHeader({ detail }) {
    qrHeader = detail ? openedHeader : qrHeaderClosed;
  }
</script>
<div transition:fade>
<Row class="justify-content-center">
  <Col sm=10 md=9>
    <Row style="margin-bottom: 10px; border-bottom: 1px solid rgb(204, 204, 204);">
      <h2>{$shlStore.label?.split('(')[0]}<span class="date-display">{"("+$shlStore.label?.split('(')[1]}</span></h2>
    </Row>
    {#if exp < today}
    <Alert color="warning">
      <Row cols={{sm:2, xs:1}}>
        <Col class="d-flex align-items-center">
          <h5 class="alert-heading">This link has expired.</h5>
        </Col>
        <Col>
          <Row>
            <Col class="d-flex align-itmes-center">
              Click here to create a new link:
            </Col>
          </Row>
          <Row>
            <Col class="d-flex align-itmes-center">
              <Button size="sm" style="width:100%" on:click={toggle} color="primary">
                <Icon name="arrow-repeat"></Icon> Create New Report Link
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>
    </Alert>
    {/if}
    <h3>Share Report</h3>
    <p>There are 2 ways to share this electronically.</p>
    <ol>
      <li>
        <strong>Email or text it:</strong> You can copy a link and paste it into an email to send. If you are using your phone, you could also paste the link into a text message.
      </li>
      <Row class="justify-content-center mt-2">
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
      <Accordion class="mt-1 mb-4">
        <AccordionItem on:toggle={updateComputerHeader}>
          <h6 slot="header" class="my-2">{computerHeader}</h6>
          <p><strong>Here's how on your computer:</strong></p>
          <ul>
            <li>First, to copy the link, click the "Copy Link" button above.</li>
            <li>Then, open your email and start a new message to the person you want to send it to.</li>
            <li>Paste the link into the body of the email.</li>
            <p class="mb-0">To Paste:</p>
            <ul style="list-style-type: circle">
              <li>After you have clicked the copy button above, control-click (or right-click), then choose "Paste" from the pop-up menu.</li>
              <li>Or, if you're using a PC, press the Ctrl and V buttons at the same time.</li>
              <li>On a Mac, press Command and V at the same time.</li>
            </ul>
            <li>Send the email. The person you send it to will receive the link to be able to see your saved Choices Report.</li>
          </ul>
        </AccordionItem>
        <AccordionItem on:toggle={updatePhoneHeader}>
          <h6 slot="header" class="my-2">{phoneHeader}</h6>
          <p><strong>Here's how on your phone:</strong></p>
          <ul>
            <li>First, to copy the link, click the "Copy Link" button above.</li>
            <li>Then, open your email or text message app and start a new message to the person you want to send it to.</li>
            <li>Paste the link into the body of the message.</li>
            <p class="mb-0">To Paste:</p>
            <ul style="list-style-type: circle">
              <li>Tap where you want to add or edit text. Tap again, then tap the "Paste" button.</li>
            </ul>
            <li>Send the message. The person you send it to will receive the link to be able to see your saved Choices Report.</li>
          </ul>
        </AccordionItem>
      </Accordion>
      <li>
        <strong>Share a QR code:</strong> Show this QR code to the person you want to share your report with. They can scan it to see your report.
      </li>
      <Row class="justify-content-center mx-4">
        <Col>
          <Row class="justify-content-center">
            <Card class="my-2 p-0">
              <CardBody class="p-0">
                <CardText>
                  {#await qrCode then qrImage}
                    <CardImg class="img-fluid" alt="QR Code for SHL" src={qrImage} />
                    <CardImg
                      style="position: absolute;
                background: #325c33;
                width: 130px;
                height: 30px;
                left: calc(50% - 65px);
                top: calc(50% - 15px);
                border: 5px solid #325c33;
                box-sizing: border-box;"
                      class="logo"
                      alt="Let's Talk Tech Logo"
                      src="/img/ltt-logo.svg"
                    />
                  {/await}
                </CardText>
              </CardBody>
            </Card>
          </Row>
        </Col>
      </Row>
      <Accordion class="my-2">
        <AccordionItem on:toggle={updateQRHeader}>
          <h6 slot="header" class="my-2">{qrHeader}</h6>
          <Row>
            <Col xs=12 md=6>
              <p><strong>Here's how to scan a QR code:</strong></p>
              <ol>
                <li>
                  Point your device’s camera at the QR code like you are taking a photo of it.
                </li>
                <li>
                  Your device should recognize the QR code, automatically scan it, and show a notification.
                  On some QR code readers, you have to press a button to scan the code.
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
    </ol>
    <Row style="margin-bottom: 10px; border-bottom: 1px solid rgb(204, 204, 204);">
      <h3 class="mt-4">Frequently Asked Questions</h3>
    </Row>
    <h5><u>Does this link expire?</u></h5>
    <p>This link and QR code
      {#if expDisplay}
        {#if exp > today}
          will last 6 months and will expire on <strong>{expDisplay}</strong>.
        {:else}
          expired on <strong>{expDisplay}</strong>.
        {/if}
      {/if}
      Even after the link expires, you can always access your saved Report through the Let’s Talk Tech website. You can deactivate the link earlier than the expiration date by clicking the <strong>Create New Report Link</strong> button below.</p>
    <h5><u>What happens after the link expires?</u></h5>
    <p>
      When your link expires, the url or QR code above will no longer work to access your saved Report. If you want to share the Report after this link expired, there are two steps:
    </p>
      <ol>
        <li>Click the <strong>Create New Report Link</strong> button below</li>
        <li>Go through the steps described above to share the new link.</li>
      </ol>
    <p>
      Even if you have already shared the Report with someone, you will need to share it again for them to still access it.
    </p>
    <h5><u>What if I change my mind about who I shared the Report with?</u></h5>
    <p>
      You can deactivate the link you shared earlier than the expiration date by clicking the <strong>Create New Report Link</strong> button below. No one you shared it with can access the Report unless you share the new link with them. The old link will no longer connect to your Report.
    </p>
    <h5><u>What if I want to share an updated Report?</u></h5>
    <p>
      After you have edited your Report, come back to this page. Then, anyone who you already shared your Report with will be able to see the updated version. To share the Report with more people, go through the steps described above.
    </p>
    <Row class="justify-content-center mx-1 mt-1">
      <Button size="sm" style="max-width:266px" on:click={toggle} color="danger"><Icon name="arrow-repeat"></Icon> Create New Report Link</Button>
      <Modal isOpen={open} backdrop="static" {toggle}>
        <ModalHeader {toggle}>Create New Report Link</ModalHeader>
        <ModalBody>
          {#if expDisplay}
            {#if exp > today}
              Those with an old link to "{$shlStore.label}" will no longer be able to view its contents.
            {:else}
              Those with the expired link can no longer view your Report.
            {/if}
          {/if}
          A new link to your Report will be generated that you may share.
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" on:click={toggle}>Cancel</Button>
          <Button color="danger" on:click={deactivateShl}>Confirm</Button>
        </ModalFooter>
      </Modal>
    </Row>
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
