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
  import mergeImages from 'merge-images';
  import CopyButton from './CopyButton.svelte';
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

  let instructions = "";

  $: {
    href = getUrl($shlStore);
  }

  $: {
    qrCode = href.then(
      r => QRCode.toDataURL(r, { errorCorrectionLevel: 'M' })
    ).then(
      qrCode => mergeImages([qrCode, {src: '/img/ltt-logo-qr.png', x:0, y:4}])
    );
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

  let defaultBtnStyle = "max-width: 120px;";
  let selectedBtnStyle = "max-width: 120px; background-color: var(--highlight-dark-color) !important";
  function updateInstructions(event) {
    if (instructions && event.target.id.includes(instructions)) {
      instructions = "";
    } else {
      instructions = event.target.id.split('-')[0];
    }
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
            <Col class="d-flex align-items-center">
              Click here to create a new link:
            </Col>
          </Row>
          <Row>
            <Col class="d-flex align-items-center">
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
    <p>Select the way you want to share your Report. The steps for how to share it will appear.</p>
    <Row class="d-flex justify-content-center">
      <Button
        id="email-button"
        size="lg"
        class="mx-2 mb-2"
        style={instructions === 'email' ? selectedBtnStyle : defaultBtnStyle}
        on:click={updateInstructions}
      >
        <strong id="email-label">Email</strong>
      </Button>
      <Button
        id="text-button"
        size="lg"
        class="mx-2 mb-2"
        style={instructions === 'text' ? selectedBtnStyle : defaultBtnStyle}
        on:click={updateInstructions}
      >
        <strong id="text-label">Text</strong>
      </Button>
      <Button
        id="qr-button"
        size="lg"
        class="mx-2 mb-2"
        style={instructions === 'qr' ? selectedBtnStyle : defaultBtnStyle}
        on:click={updateInstructions}
      >
        <strong id="qr-label">QR Code</strong>
      </Button>
    </Row>
    {#if instructions === 'email' || instructions === 'text' || instructions === 'qr'}
    <Row class="pt-2 pb-3">
    {#if instructions === 'email'}
      <Card style="max-width: 100%">
        <CardBody class="p-3">
          <h3>Email</h3>
          <p><strong>Email it.</strong> You can copy a link and paste it into an email to send.</p>
          {#await href then href}
            <Row class="justify-content-center">
              <Col xs="auto" class="mb-2">
                <CopyButton href={href} />
              </Col>
            </Row>
          {/await}
          <ul>
            <li>First, click the Copy button above.</li>
            <li>Then, open your email and start a new message to the person you want to send it to.</li>
            <li>Paste the link into the body of the email.</li>
            <p class="mb-0">Here's how to paste on your computer:</p>
            <ul style="list-style-type: circle">
              <li>After you have clicked the Copy button above, control-click (or right-click), then choose "Paste" from the pop-up menu.</li>
              <li>Or, if you're using a PC, press the Ctrl and V buttons at the same time.</li>
              <li>On a Mac, press Command and V at the same time.</li>
            </ul>
            <li>Send the email. The person you send it to will receive the link to your saved Choices Report.</li>
          </ul>
        </CardBody>
      </Card>
    {:else if instructions === 'text'}
      <Card style="max-width: 100%">
        <CardBody class="p-3">
          <h3>Text</h3>
          <p><strong>Text it.</strong> If you are using Let's Talk Tech on your phone, you can copy a link and paste it into a text message.</p>
          {#await href then href}
            <Row class="justify-content-center">
              <Col xs="auto" class="mb-2">
                <CopyButton href={href} />
              </Col>
            </Row>
          {/await}
          <ul>
            <li>First, click the Copy button above.</li>
            <li>Then, open your text message app and start a new message to the person you want to send it to.</li>
            <li>Paste the link into the body of the message.</li>
            <p class="mb-0">Here's how to paste on your phone:</p>
            <ul style="list-style-type: circle">
              <li>Tap where you want to add or edit text. Tap again, then tap the Paste button.</li>
            </ul>
            <li>Send the message. The person you send it to will receive the link to your saved Choices Report.</li>
          </ul>
        </CardBody>
      </Card>
    {:else if instructions === 'qr'}
      <Card style="max-width: 100%">
        <CardBody>
          <Row>
            <h3>Share a QR Code</h3>
            <p><strong>Share a QR code.</strong> Show this QR code to the person you want to share your Report with. They can scan it to see your Report.</p>
          </Row>
          <Row class="justify-content-center">
            <Col>
              <Row class="justify-content-center">
                <Card class="my-2 p-0">
                  <CardBody class="p-0">
                    <CardText>
                      {#await qrCode then qrImage}
                        <CardImg class="img-fluid" alt="QR Code for SHL" src={qrImage} />
                      {/await}
                    </CardText>
                  </CardBody>
                </Card>
              </Row>
            </Col>
          </Row>
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
                <img src="/img/qrphone.png" alt="Scan a QR Code" style="max-height: 300px"/>
              </Col>
            </Col>
          </Row>
        </CardBody>
      </Card>
    {/if}
    </Row>
    {/if}
    {#await href then href}
    <Row class="mt-1">
      <p>Here is the link to your Report that you can copy and share with others:</p>
    </Row>
    <Row class="justify-content-center">
      <Col xs="auto" class="mb-2">
        <CopyButton href={href} />
      </Col>
    </Row>
    {/await}

    <Row style="margin-bottom: 10px">
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
      You can deactivate the link you shared earlier than the expiration date by clicking the <strong>Create New Report Link</strong> button below. The old link will no longer connect to your Report. No one you shared it with can access the Report unless you share the new link with them.
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
