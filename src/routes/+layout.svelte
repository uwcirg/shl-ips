<script lang="ts">
  import { goto } from '$app/navigation';
  import { setContext } from 'svelte';
  import { writable } from 'svelte/store';
  import {
    Dropdown,
    Col,
    Collapse,
    Container,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Icon,
    Image,
    Nav,
    Navbar,
    NavbarBrand,
    NavItem,
    NavLink,
    NavbarToggler,
    Row,
    Styles
  } from 'sveltestrap';
  import { SHLClient, type SHLAdminParams } from '$lib/managementClient';
  import { VERSION_STRING } from '../lib/config';

  const LOCAL_STORAGE_KEY = 'shlips_store_shls';
  let shlStore = writable<SHLAdminParams[]>(
    window.localStorage[LOCAL_STORAGE_KEY] ? JSON.parse(window.localStorage[LOCAL_STORAGE_KEY]) : []
  );

  const MODE_KEY = 'demo_mode';
  let mode = writable('normal');
  window.localStorage[MODE_KEY] ? mode.set(JSON.parse(window.localStorage[MODE_KEY])) : mode.set('normal');

  $: {
    if ($shlStore) window.localStorage[LOCAL_STORAGE_KEY] = JSON.stringify($shlStore);
  }

  $: {
    if ($mode) window.localStorage[MODE_KEY] = JSON.stringify($mode);
  }
  
  setContext('shlStore', shlStore);
  
  setContext('mode', mode);

  let shlClient = new SHLClient();
  setContext('shlClient', shlClient);

  let reset = writable(0);
  setContext('reset', reset);

  let isOpen = false;
  function handleUpdate(event) {
    isOpen = event.detail.isOpen;
  }
  function closeNav() {
    isOpen = false;
  }

  let locale = "English";
  let locales = {
    "Amharic": "አማርኛ", "Arabic": "العَرَبِيةُ", "Armenian": "Հայերեն",
    "Basque": "euskara", "Burmese": "မြန်မာ", "Catalan": "català",
    "Chinese (Simplified)": "简体中文", "Chinese (Traditional)": "繁體中文",
    "Chuukese": "Fosun Chuuk", "Dari": "دری", "English": "English", "Farsi": "فارسی",
    "French": "Français", "Fijian": "Vosa vakaviti", "German": "Deutsch",
    "Gujarati": "ગુજરાતી", "Haitian Creole": "Kreyòl ayisyen",
    "Hebrew": "עִברִית", "Hindi": "हिन्दी", "Hmong": "Hmoob",
    "Italian": "Italiano", "Japanese": "日本語", "Karen": "ကညီၤ",
    "Khmer (Cambodian)": "ភាសាខ្មែរ", "Korean": "한국어", "Lao": "ພາ​ສາ​ລາວ",
    "Malayalam": "മലയാളം", "Mam": "Qyol Mam", "Marathi": "मराठी",
    "Marshallese": "Kajin Ṃajeḷ", "Mixteco Bajo": "Ñuu savi",
    "Nepali": "नेपाली", "Oromo": "Oromiffa", "Pashto": "پښتو",
    "Portuguese": "Português", "Punjabi": "ਪੰਜਾਬੀ",
    "Romanian": "Română", "Russian": "Русский", "Samoan": "Faa-Samoa",
    "Somali": "Af Soomaali", "Spanish": "Español", "Swahili": "Kiswahili",
    "Tamil": "தமிழ்", "Tagalog": "Tagalog", "Telugu": "తెలుగు",
    "Thai": "ภาษาไทย", "Tigrinya": "ትግርኛ", "Tongan": "Lea fakaTonga",
    "Turkish": "Türkçe", "Ukrainian": "Український", "Urdu": "اُردُو",
    "Vietnamese": "Tiếng Việt"
  };
</script>
<Container class="main" fluid>
<Styles />
<Navbar color="light" light expand="md" style="border-bottom: 1px solid rgb(204, 204, 204);">
  <NavbarBrand href="https://doh.wa.gov/">
    <Row>
      <Col>
        <Image alt="Washington State Department of Health Logo" width="240" src="/img/doh_logo_doh-black.png"/>
      </Col>
      <Col style="vertical-align:middle" class="d-none d-sm-block">
        <span style="font-size:medium">Washington State</span>
        <p style="margin: 0px; padding: 0px: line-height: 0;"></p>
        <span style="font-size:medium">Department of Health</span>
      </Col>
    </Row>
  </NavbarBrand>
  <NavbarToggler on:click={() => (isOpen = !isOpen)} />
  <Collapse {isOpen} navbar expand="md" on:update={handleUpdate}>
    <Nav class="ms-auto" navbar>
      <NavItem>
        <NavLink href="/home" on:click={closeNav}>Home</NavLink>
      </NavItem>
      <Dropdown nav inNavbar size="sm" direction="down">
        <DropdownToggle color="primary" nav caret>Actions</DropdownToggle>
        <DropdownMenu end style="max-height: 500px; overflow:auto">
          <DropdownItem
            on:click={() => {
              closeNav();
              goto("/create");
            }}>Add New SHLink</DropdownItem>
          <DropdownItem
            on:click={() => {
              closeNav();
              $shlStore = [];
              goto('/');
            }}>Reset Demo</DropdownItem>
            <DropdownItem divider />
            <DropdownItem
              on:click={() => {
                $mode = ($mode === 'advanced' ? 'normal' : 'advanced');
            }}>
              <Row class="mr-0" style="min-width:240px">
                <Col class="d-flex justify-content-start align-items-center pe-0">
                  {$mode === "advanced" ? "Hide" : "Show"} Advanced Features
                </Col>
                <Col class="d-flex justify-content-end ps-0">
                  {#if $mode == 'advanced'}
                  <Icon class="text-primary" name="toggle-on"></Icon>
                  {:else}
                  <Icon class="text-secondary" name="toggle-off"></Icon>
                  {/if}
                </Col>
              </Row>
            </DropdownItem>
          {#if $shlStore.length > 0}
            <DropdownItem divider />
            <DropdownItem header>View Stored SHLinks</DropdownItem>
            {#each $shlStore as shl, i}
              <DropdownItem
                on:click={() => {
                closeNav();
                goto('/view/' + shl.id);
              }}>{shl.label || `SHLink ${i + 1}`}</DropdownItem>
            {/each}
          {/if}
        </DropdownMenu>
      </Dropdown>
      <Dropdown nav inNavbar size="sm" direction="down">
        <DropdownToggle color="primary" nav caret>
          <Icon name="globe2"></Icon>
          {locale}
        </DropdownToggle>
        <DropdownMenu end style="height: 500px; overflow:auto">
          {#each Object.entries(locales) as [en, loc]}
            <DropdownItem
              style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
              on:click={() => {
                closeNav();
                locale=loc;
              }}>{`${en}${en !== loc ? " - "+loc : ""}`}</DropdownItem
            >
          {/each}
        </DropdownMenu>
      </Dropdown>
    </Nav>
  </Collapse>
</Navbar>
<div on:click={closeNav} on:keypress={closeNav}>
<Row style="padding:0px 12px">
  <Col style="padding:0; margin-bottom: 20px; border-bottom: 1px solid rgb(204, 204, 204);">
    <Image alt="WA Verify Logo" width="200" src="/img/waverifypluslogo.png" style="align-self: center" />
    <div style="vertical-align: middle; font-size: 18px; display: inline-block; padding-left: 17px; font-family: Verdana, sans-serif; color: rgb(34, 72, 156);">International Patient Summary Prototype</div>
  </Col>
</Row>
<Row class="main-row">
  <Col>
    <slot />
  </Col>
</Row>
<Row>
  <Col style="margin-top: 20px; padding-top: 20px; border-top: 1px solid rgb(204, 204, 204);" >
    <footer>
      This demonstration shows how to create a <a
        target="_blank"
        rel="noreferrer"
        href="https://docs.smarthealthit.org/smart-health-links/user-stories">SMART Health Link</a
      >
      for any FHIR
      <a href="https://build.fhir.org/ig/HL7/fhir-ips/" target="_blank" rel="noreferrer"
        >International Patient Summary</a
      >
      document. SHLinks can be shared by copy/paste, or by presenting a QR code.
      {#if $mode === "advanced"}
        For more information, view the source code and license at
        <a href="https://github.com/uwcirg/shl-ips" target="_blank" rel="noreferrer"
          >https://github.com/uwcirg/shl-ips</a
        >. {VERSION_STRING ? "Site version: " + VERSION_STRING : ""}
      {/if}
    </footer>
  </Col>
</Row>
</div>
</Container>

<style>
  :global(.main-row) {
    flex-grow: 1;
  }
  footer {
    margin-bottom: 1em;
    font-style: italic;
  }
  :global(div.container-fluid.main) {
    min-height: 100%;
    margin-right: auto;
    margin-left: auto;
    max-width: 800px;
    display: flex;
    flex-direction: column;
  }
  :global(html, body) {
    height: 100%;
  }
  :global(.navbar .container-fluid) {
    padding: 0px;
  }
</style>
