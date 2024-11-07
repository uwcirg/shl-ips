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
  import { goto } from '$app/navigation';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams, SHLClient } from '$lib/utils/managementClient';

  export let shl: SHLAdminParams;
  let shlControlled: SHLAdminParams;
  let open = false;
  const toggle = () => (open = !open);

  function syncProps(shl: SHLAdminParams) {
    shlControlled = JSON.parse(JSON.stringify(shl));
  }
  $: syncProps(shl);

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  let shlClient: SHLClient = getContext('shlClient');
  let mode: Writable<string> = getContext('mode');

  let copyNotice = '';

  let href: Promise<string>;
  let qrCode: Promise<string>;
  let showPassword = false;
  $: type = showPassword ? 'text' : 'password';
  $: icon = showPassword ? 'eye-fill' : 'eye-slash-fill';
  $: {
    href = getUrl(shl);
  }

  $: {
    qrCode = href
      .then((r) => QRCode.toDataURL(r, { errorCorrectionLevel: 'M' }))
      // .then(qrCode => mergeImages([qrCode, {src: '/img/qrcode-logo.png', x:0, y:4}]));
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

  async function getUrl(shl: SHLAdminParams) {
    let shlMin = {
      id: shl.id,
      managementToken: shl.managementToken,
      encryptionKey: shl.encryptionKey,
      passcode: shl.passcode,
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
    shlClient.deleteShl(shl);
    $shlStore = $shlStore.filter((l) => l.id !== shl.id);
    toggle();
    goto('/');
  }

  async function addFile() {
    goto(`/create?shlid=${shl.id}`);
  }

  async function deleteFile(fileContent:string) {
    shl = await shlClient.deleteFile(shl, fileContent).then((shl) => {
      let updatedFiles = shl.files.filter((f) => f.contentEncrypted !== fileContent);
      shl.files = updatedFiles;
      return shl;
    });
    $shlStore[$shlStore.findIndex(obj => obj.id === shl.id)] = shl;
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
<Row cols={{ md: 2, xs: 1 }}>
  <Col>
    <Card class="mb-3" color="light">
      <CardHeader>
        <CardTitle>
          <Icon name={shl.passcode ? 'lock' : 'unlock'} />
          {shl.label}
        </CardTitle>
      </CardHeader>
      <CardBody>
        {#if shl.exp}
          <CardSubtitle color="success">
            Expires: {new Date(shl.exp * 1000).toISOString().slice(0, 10)}
          </CardSubtitle>
        {/if}
        <CardText>
          {#await qrCode then dataUrl}
            <CardImg class="img-fluid" alt="QR Code for SHL" src="/img/qr-banner-top.png" />
            <CardImg class="img-fluid" alt="QR Code for SHL" src={dataUrl} />
            <CardImg class="img-fluid" alt="QR Code for SHL" src="/img/qr-banner-bottom.png" />
          {/await}
        </CardText>
      </CardBody>
      <CardFooter>
        <Row class="justify-content-center">
          {#if canShare}
          {#await qrCode then dataUrl}
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
                    text: `${(shl.label ? `${shl.label}\n\n` : "")}Here's my WA Verify+ Health Summary:\n\n`
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
  <Col>
    <FormGroup class="label shlbutton">
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
      <Label for="label">Label for SMART Health Link</Label>
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
          $shlStore = $shlStore.map((e) => {
            if (e.id === shl.id) {
              shl = { ...shl, label: shlControlled.label };
              return shl;
            } else {
              return e;
            }
          });
        }}>
        <Icon name="sticky" /> Update Label
      </Button>
    </FormGroup>
    <FormGroup class="passcode shlbutton">
      <Label for="passcode">Add or Update Passcode (optional)</Label>
      <div style="position:relative">
        <Input
          maxlength={40}
          name="passcode"
          type={type}
          bind:value={shlControlled.passcode}
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
        disabled={(shl.passcode || '') === (shlControlled.passcode || '')}
        on:click={async () => {
          await shlClient.resetShl({ ...shl, passcode: shlControlled.passcode });
          $shlStore = $shlStore.map((e) =>
            e.id === shl.id ? { ...shl, passcode: shlControlled.passcode } : e
          );
        }}><Icon name="lock" /> Update Passcode</Button>
    </FormGroup>
    <FormGroup class="shlbutton">
      <Button size="sm" on:click={toggle} color="danger"><Icon name="trash3" /> Delete SMART Health Link</Button>
      <Modal isOpen={open} backdrop="static" {toggle}>
        <ModalHeader {toggle}>Delete SMART Health Link</ModalHeader>
        <ModalBody>
          "{shl.label}" will be permanently deleted. Continue?
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" on:click={toggle}>Cancel</Button>
          <Button color="danger"  on:click={deleteShl}><Icon name="trash3" /> Yes, Delete SHL</Button>
        </ModalFooter>
      </Modal>
    </FormGroup>
  </Col>
</Row>
{#if $mode === 'advanced'}
  <Row>
    <h3>Contents</h3>
    <Label>Add or remove summaries shared by this link.</Label>
  </Row>
  {#if shl.files.length == 0}
  <Row>
    <p><em>No Summaries found</em></p>
  </Row>
  {/if}
  {#each shl.files as file (file.contentEncrypted)}
  <Row>
    <Col>
      <Card class="mb-3" color="light">
        <CardHeader>
          <Row class="align-items-center">
            <Col xs=6 class="align-items-center">
              {#if file.date}
                <strong><Icon name="calendar"></Icon> {file.date}</strong>
              {/if}
            </Col>
            <Col xs=6>
              <Row class="justify-content-end">
                <Button size="sm" color="danger" style="width: fit-content" on:click={(e) => {
                  deleteFile(file.contentEncrypted);
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
    </Col>
  </Row>
  {/each}
  <Row>
    <Col>
      <Button class="mb-3" color="primary" on:click={addFile}><Icon name="file-earmark-plus" /> Add {shl.files.length == 0 ? "a" : "another"} Summary</Button>
    </Col>
  </Row>
{/if}

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
  :global(div.card) {
    max-width: 300px;
  }
  :global(.card-title) {
    font-size: 1em;
    font-weight: bold;
  }
</style>
