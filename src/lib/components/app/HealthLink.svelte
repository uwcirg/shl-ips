<script lang="ts">
  import QRCode from 'qrcode';
  import { getContext, onMount } from 'svelte';
  import {
    Alert,
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    CardImg,
    CardSubtitle,
    CardText,
    CardTitle,
    Col,
    Form,
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
  import { goto } from '$app/navigation';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams, SHLClient } from '$lib/utils/managementClient';
  import type { SHL } from '$lib/utils/SHL';
  import type { SHLStore } from '$lib/utils/SHLStore';

  export let shl: SHL;
  let shlControlled: SHLAdminParams;
  let open = false;
  const toggle = () => (open = !open);

  function syncProps(shl: SHLAdminParams) {
    shlControlled = shl.toJSON();
  }
  $: syncProps(shl);

  let shlStore: SHLStore = getContext('shlStore');
  let shlClient: SHLClient = getContext('shlClient');
  let mode: Writable<string> = getContext('mode');

  let copyNotice = '';

  let href: Promise<string>;
  let qrCodeImage: Promise<string>;
  let showPassword = false;
  $: type = showPassword ? 'text' : 'password';
  $: icon = showPassword ? 'eye-fill' : 'eye-slash-fill';
  $: {
    href = getUrl(shl);
    qrCodeImage = createQrCodeImage(href);
  }

  let canShare = navigator?.canShare?.({ url: 'https://example.com', title: 'Title' });

  let linkIsActive: boolean;
  let showActive: boolean;
  let linkNotFound: boolean = false;

  onMount(async () => {
    try {
      linkIsActive = await shlClient.isActive(shl.id);
    } catch (e) {
      console.error(e);
      linkNotFound = true;
    }
  });

  // Combine header, qr code, and footer images into one image
  async function createQrCodeImage(href: Promise<string>) {
    // create the qr code image
    const qrCodeURI = await href.then(href => QRCode.toDataURL(href, { errorCorrectionLevel: 'M', margin: 0 }));

    // load the images
    const uris = [qrCodeURI, "/img/qr-banner-top.png", "/img/qr-banner-bottom.png"];
    const [qrCode, header, footer] = await Promise.all(
        uris.map(uri => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(new Error('Failed to load image from data URI.'));
        img.src = uri;
      })
    )) as HTMLImageElement[];

    // scale the images to match the largest image width
    const targetWidth: number = Math.max(qrCode.width, header.width, footer.width);
    const headerHeight: number = (header.height / header.width) * targetWidth;
    const qrCodeImageHeight: number = (qrCode.height / qrCode.width) * targetWidth;
    const footerHeight: number = (footer.height / footer.width) * targetWidth;

    // get the canvas and combine the images
    const canvas = document.getElementById('qrcode') as HTMLCanvasElement;
    if (!canvas) {
      throw Error('Could not get qrcode canvas element');
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw Error('Could not get canvas context');
    }
    const marginX = 60;
    const marginY = 40;
    canvas.width = targetWidth + marginX * 2;
    canvas.height = headerHeight + qrCodeImageHeight + footerHeight + marginY * 4;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(header, marginX, marginY,                                    targetWidth, headerHeight);
    ctx.drawImage(qrCode, marginX, headerHeight + marginY * 2,                     targetWidth, qrCodeImageHeight);
    ctx.drawImage(footer, marginX, headerHeight + qrCodeImageHeight + marginY * 3, targetWidth, footerHeight);

    const fullImageDataUrl = canvas.toDataURL('image/png');
    return fullImageDataUrl;
  }

  async function getUrl(shl: SHLAdminParams) {
    let shlMin = {
      id: shl.id,
      url: shl.url,
      managementToken: shl.managementToken,
      key: shl.key,
      passcode: shl.passcode ?? "",
      exp: shl.exp ?? 0,
      files: []
    }
    return await shlClient.toLink(shlMin);
  }

  async function copyShl() {
    let copyNoticePrev = copyNotice;
    copyNotice = '...';
    let text = await getUrl(shl);
    navigator.clipboard.writeText(text);
    copyNotice = 'Copied!';
    setTimeout(() => {
      copyNotice = copyNoticePrev;
    }, 1000);
  }

  async function deleteShl() {
    await shlStore.deleteSHL(shl.id);
    toggle();
    goto('/');
  }

  async function addFile() {
    goto(`/create?shlid=${shl.id}`);
  }

  async function deleteFile(contentHash:string) {
    shl.deleteFile(contentHash);
    shl = await shlClient.deleteFile(shl, contentHash).then((shl) => {
      let updatedFiles = shl.files.filter((f) => f.contentHash !== contentHash);
      shl.files = updatedFiles;
      return shl;
    });
    $shlStore = await shlClient.getUserShls();
  }
</script>
{#if linkNotFound}
<Alert color="danger" dismissible fade={false}>
  <Col class="d-flex justify-content-between">
    <Col class="d-flex align-items-center">
      <Icon name="exclamation-octagon-fill" />&nbsp;This link no longer exists.
    </Col>
  </Col>
</Alert>
{/if}

<!-- Placeholder elements for QR Code image construction -->
<canvas id="qrcode" class="img-fluid" style="display: none;"/>

<Row cols={{ md: 2, xs: 1 }}>
  <Col class="d-flex justify-content-center">
    <Card class="mb-3" color="light">
      <CardHeader>
        <CardTitle>
          <Icon name={shl.passcode ? 'lock' : 'unlock'} />
          {shl.label}
        </CardTitle>
        {#if shl.exp}
          <CardSubtitle color="success">
            Expires: {new Date(shl.exp * 1000).toLocaleDateString()}
          </CardSubtitle>
        {/if}
      </CardHeader>
      <CardBody>
        {#await qrCodeImage then dataUrl}
          <CardImg class="img-fluid" alt="QR Code for SHL" src={dataUrl} style="background-color: white"/>
        {/await}
      </CardBody>
      <CardFooter>
        <Row class="justify-content-center">
          {#if canShare}
            {#await qrCodeImage then dataUrl}
              <Button
                size="sm"
                color="primary"
                class="mx-1" style="width: fit-content"
                on:click={async () => {
                  const blob = await (await fetch(dataUrl)).blob();
                  const file = new File([blob], 'wa-verify-plus-qrcode.png', { type: blob.type });
                  if (navigator.canShare({ files: [file]})) {
                    navigator.share({
                      files: [file],
                      url: await href,
                      text: `${(shl.label ? `${shl.label}\n\n` : "")}Here's my WA Health Summary:\n\n`
                    });
                  } else {
                    navigator.share({ url: await href, title: shl.label });
                  }
                }}>
                  <Icon name="share" /> Share
                </Button>
            {/await}
          {/if}
          <Button size="sm" color="primary" class="mx-1" style="width: fit-content" on:click={copyShl} disabled={!!copyNotice}>
            <Icon name="clipboard" />
            {#if copyNotice}
              {copyNotice}
            {:else}
              Copy Link
            {/if}
          </Button>
          {#await href then href}
            <Button size="sm" color="primary" class="mx-1" style="width: fit-content" {href} target="_blank">
              <Icon name="box-arrow-up-right" /> Open
            </Button>
          {/await}
        </Row>
      </CardFooter>
    </Card>
  </Col>
  <Col class="d-flex justify-content-center">
    <Form>
      <FormGroup class="label shlbutton" style="width: 100%">
        <div style="border-bottom: 1px solid rgb(204, 204, 204); margin-bottom: 1em"><h3>Manage Link</h3></div>
        {#await linkIsActive then active}
          <Alert isOpen={active === false} color="danger" fade={false}>
            <Col class="d-flex justify-content-between">
              <Col class="d-flex align-items-center">
                <Icon name="exclamation-octagon-fill" />&nbsp;Inactive link
              </Col>
              <Button
              size="sm" 
              color="danger" 
              style="width: fit-content"
              on:click={async () => {
                await shlClient.reactivate(shl).then(async () => {
                  linkIsActive = await shlClient.isActive(shl.id);
                  showActive = linkIsActive;
                  setTimeout(() => {
                    showActive = false;
                  }, 2000)
                });
              }}>
                <Icon name="arrow-counterclockwise"/>
                Reactivate
              </Button>
            </Col>
          </Alert>
        {/await}
        {#if showActive}
          <Alert color="success">
            <Icon name="check-circle-fill" />&nbsp;Active
          </Alert>
        {/if}
        <Label for="label">Label for Summary Link</Label>
        <Input
          name="label"
          maxlength={40}
          type="text"
          bind:value={shlControlled.label}
          placeholder="label"
        />
        <Button
          size="sm"
          color="primary"
          disabled={(shl.label || '') === (shlControlled.label || '')}
          on:click={async () => {
            await shlClient.resetShl({ ...shl, label: shlControlled.label });
            $shlStore = await shlClient.getUserShls();
          }}>
          <Icon name="sticky" /> Update Label
        </Button>
        <Label for="passcode">Add or Update Passcode (optional)</Label>
        <div style="position:relative">
          <Input
            maxlength={40}
            name="passcode"
            type={type}
            autocomplete="off"
            bind:value={shlControlled.config.passcode}
            placeholder="Assign Passcode"
          />
          <Icon name={icon}
            style="position: absolute;
            cursor: pointer;
            height: 25px;
            width: 20px;
            top: 6px;
            right: 10px;
            color: rgb(50, 50, 50);"
            onclick={() => showPassword = !showPassword}/>
        </div>
        <Button
          size="sm"
          color="primary"
          disabled={(shl.passcode || '') === (shlControlled.config.passcode || '')}
          on:click={async () => {
            await shlClient.resetShl({ ...shl, passcode: shlControlled.config.passcode });
            $shlStore = await shlClient.getUserShls();
          }}><Icon name="lock" /> Update Passcode</Button>
        <Button size="sm" on:click={toggle} color="danger"><Icon name="trash3" /> Delete Summary Link</Button>
        <Modal isOpen={open} backdrop="static" {toggle}>
          <ModalHeader {toggle}>Delete Summary Link</ModalHeader>
          <ModalBody>
            "{shl.label}" and any summaries it contains will be permanently deleted. Continue?
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" on:click={toggle}>Cancel</Button>
            <Button color="danger"  on:click={deleteShl}><Icon name="trash3" /> Yes, Delete Summary Link</Button>
          </ModalFooter>
        </Modal>
      </FormGroup>
    </Form>
  </Col>
  {#if $mode === 'advanced'}
  <Col class="d-flex justify-content-center">
    <FormGroup class="label shlbutton" style="width: 100%">
      <div style="border-bottom: 1px solid rgb(204, 204, 204); margin-bottom: 1em"><h3>Content</h3></div>
      <Label>Add, update, or remove summaries shared by this link.</Label>
      {#if shl.files.length == 0}
        <p><em>No Summaries found</em></p>
      {/if}
      {#each shl.files as file (file.contentHash)}
        <Card class="mb-2" color="light">
          <CardHeader>
            <Row class="align-items-center">
              <Col xs=6 class="align-items-center">
                {#if file.added}
                  <strong><Icon name="calendar"></Icon> {file.added.split(' ')[0]}</strong>
                {/if}
              </Col>
              <Col xs=6>
                <Row class="justify-content-end">
                  <Button size="sm" color="danger" class="my-0 mx-1" style="width: fit-content" on:click={(e) => {
                    deleteFile(file.contentHash);
                  }}>
                    <Icon name="trash3" />
                  </Button>
                </Row>
              </Col>
            </Row>
          </CardHeader>
          <CardBody>
            {#if file.contentType}
            <CardText color="light" style="overflow: hidden; text-overflow: ellipsis">
              <Icon name="file-earmark-text" /> {file.label ?? file.contentType}
            </CardText>
            {/if}
          </CardBody>
        </Card>
      {/each}
      <Button class="mb-3" color="primary" on:click={addFile}><Icon name="file-earmark-plus" /> Add {shl.files.length == 0 ? "a" : "another"} Summary</Button>
    </FormGroup>
  </Col>
  {/if}
</Row>

<style>
  img.qr {
    height: 100%;
  }
  p.logo {
    position: relative;
    width: 250px;
    height: 250px;
  }
  img.logo {
    position: absolute;
    background: white;
    width: 100px;
    left: calc(50% - 50px);
    top: calc(50% - 1em);
    border: 2px solid white;
    box-sizing: border-box;
  }
  :global(.shlbutton) {
    width: 300px !important;
  }
  :global(.shlbutton input, .shlbutton button) {
    width: 100%;
    display: inline-block;
  }
  :global(.shlbutton button) {
    margin-top: 1em;
    margin-bottom: 1em;
  }
  :global(div.card) {
    max-width: 300px;
  }
  :global(.card-title) {
    font-size: 1em;
    font-weight: bold;
  }
</style>
