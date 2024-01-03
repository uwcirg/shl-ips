<script lang="ts">
  import QRCode from 'qrcode';
  import { getContext } from 'svelte';
  import {
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
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

  import { goto } from '$app/navigation';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams, SHLClient } from './managementClient';

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

  let copyNotice = '';

  let href: Promise<string>;
  let qrCode: Promise<string>;
  let showPassword = false;
  $: type = showPassword ? 'text' : 'password';
  $: icon = showPassword ? 'eye-slash-fill' : 'eye-fill';
  $: {
    href = getUrl(shl);
  }

  $: {
    qrCode = href.then((r) => QRCode.toDataURL(r, { errorCorrectionLevel: 'M' }));
  }

  let canShare = navigator?.canShare?.({ url: 'https://example.com', title: 'Title' });

  async function getUrl(shl: SHLAdminParams) {
    let shlMin = {
      id: shl.id,
      managementToken: shl.managementToken,
      encryptionKey: shl.encryptionKey,
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
<Row cols={{ md: 2, sm: 1 }}>
  <Col>
    <Card class="mb-3" color="light">
      <CardHeader>
        <CardTitle>
          <Icon name={shl.passcode ? 'lock' : 'unlock'} />
          {shl.label}</CardTitle
        >
      </CardHeader>
      <CardBody>
        {#if shl.exp}
          <CardSubtitle color="success">
            Expires: {new Date(shl.exp * 1000).toISOString().slice(0, 10)}
          </CardSubtitle>
        {/if}
    
        <CardText>
          {#await qrCode then dataUrl}
            <p class="logo">
              <img class="qr" alt="QR Code for SHL" src={dataUrl} />
              <img class="logo" alt="WA Verify+ Logo" src='/img/waverifypluslogo.png' />
            </p>
          {/await}
        </CardText>
      </CardBody>
      <CardFooter>
        {#if canShare}
          <Button
            size="sm"
            color="success"
            on:click={async () => {
              navigator.share({ url: await href, title: shl.label });
            }}><Icon name="share" /> Share</Button
          >
        {/if}
        <Button size="sm" color="success" on:click={copyShl} disabled={!!copyNotice}>
          <Icon name="clipboard" />
          {#if copyNotice}
            {copyNotice}
          {:else}
            Copy Link
          {/if}
        </Button>
        {#await href then href}
          <Button size="sm" color="success" {href} target="_blank">
            <Icon name="box-arrow-up-right" /> View IPS
          </Button>
        {/await}
      </CardFooter>
    </Card>
  </Col>
  <Col>
    <FormGroup class="label shlbutton">
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
        color="secondary"
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
        color="secondary"
        disabled={(shl.passcode || '') === (shlControlled.passcode || '')}
        on:click={async () => {
          await shlClient.resetShl({ ...shl, passcode: shlControlled.passcode });
          $shlStore = $shlStore.map((e) =>
            e.id === shl.id ? { ...shl, passcode: shlControlled.passcode } : e
          );
        }}><Icon name="lock" /> Update Passcode</Button>
    </FormGroup>
    <FormGroup class="shlbutton">
      <Button size="sm" on:click={toggle} color="danger">Delete SMART Health Link</Button>
      <Modal isOpen={open} backdrop="static" {toggle}>
        <ModalHeader {toggle}>Delete SMART Health Link</ModalHeader>
        <ModalBody>
          "{shl.label}" will be permanently deleted. Continue?
        </ModalBody>
        <ModalFooter>
          <Button color="danger"  on:click={deleteShl}><Icon name="trash" /> Delete SHL</Button>
          <Button color="secondary" on:click={toggle}>Cancel</Button>
        </ModalFooter>
      </Modal>
    </FormGroup>
  </Col>
</Row>
<Row>
  <h2>SHL Content</h2>
</Row>
{#if shl.files.length == 0}
<Row>
  <p><em>No records found</em></p>
</Row>
{/if}
{#each shl.files as file (file.contentEncrypted)}
<Row>
  <Col>
    <Card class="mb-3" color="light">
      <CardHeader>
        <CardTitle>
          IPS 
          {#if file.date}
            {file.date}
          {/if}
        </CardTitle>
      </CardHeader>
      <CardBody>
        {#if file.contentType}
        <CardText color="light" style="overflow: hidden; text-overflow: ellipsis">
          <Icon name="file-earmark-text" /> {file.contentType}
        </CardText>
        {/if}
      </CardBody>
      <CardFooter>
        <Button size="sm" color="danger" on:click={(e) => {
          deleteFile(file.contentEncrypted);
        }}>
          <Icon name="trash" /> Delete
        </Button>
      </CardFooter>
    </Card>
  </Col>
</Row>
{/each}
<Row>
  <Col>
    <Button class="mb-3" color="success" on:click={addFile}><Icon name="file-earmark-plus" /> Add Record</Button>
  </Col>
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
  :global(div.card) {
    max-width: 300px;
  }
  :global(.card-title) {
    font-size: 1em;
    font-weight: bold;
  }
</style>
