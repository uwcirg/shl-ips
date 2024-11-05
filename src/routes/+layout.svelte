<script lang="ts">
  import {
    Container,
    Row,
    Col,
    Styles
  } from 'sveltestrap';
  import { setContext } from 'svelte';
  import {writable, type Writable, readable, type Readable } from 'svelte/store';
  import { VERSION_STRING } from '$lib/config';
  import type { Language } from '$lib/types';

  const locale: Writable<string> = writable('en');
  const locales: Readable<Record<string, Language>> = readable({
    am: { lang_en: 'Amharic', lang: 'አማርኛ', code: 'am' },
    ar: { lang_en: 'Arabic', lang: 'العَرَبِيةُ', code: 'ar' },
    hy: { lang_en: 'Armenian', lang: 'Հայերեն', code: 'hy' },
    eu: { lang_en: 'Basque', lang: 'euskara', code: 'eu' },
    my: { lang_en: 'Burmese', lang: 'မြန်မာ', code: 'my' },
    ca: { lang_en: 'Catalan', lang: 'català', code: 'ca' },
    'zh-CN': { lang_en: 'Chinese (Simplified)', lang: '简体中文', code: 'zh-CN' },
    'zh-TW': { lang_en: 'Chinese (Traditional)', lang: '繁體中文', code: 'zh-TW' },
    chk: { lang_en: 'Chuukese', lang: 'Fosun Chuuk', code: 'chk' },
    'fa-AF': { lang_en: 'Dari', lang: 'دری', code: 'fa-AF' },
    en: { lang_en: 'English', lang: 'English', code: 'en' },
    fa: { lang_en: 'Farsi', lang: 'فارسی', code: 'fa' },
    fr: { lang_en: 'French', lang: 'Français', code: 'fr' },
    fj: { lang_en: 'Fijian', lang: 'Vosa vakaviti', code: 'fj' },
    de: { lang_en: 'German', lang: 'Deutsch', code: 'de' },
    gu: { lang_en: 'Gujarati', lang: 'ગુજરાતી', code: 'gu' },
    ht: { lang_en: 'Haitian Creole', lang: 'Kreyòl ayisyen', code: 'ht' },
    he: { lang_en: 'Hebrew', lang: 'עִברִית', code: 'he' },
    hi: { lang_en: 'Hindi', lang: 'हिन्दी', code: 'hi' },
    hmn: { lang_en: 'Hmong', lang: 'Hmoob', code: 'hmn' },
    it: { lang_en: 'Italian', lang: 'Italiano', code: 'it' },
    ja: { lang_en: 'Japanese', lang: '日本語', code: 'ja' },
    kar: { lang_en: 'Karen', lang: 'ကညီၤ', code: 'kar' },
    km: { lang_en: 'Khmer (Cambodian)', lang: 'ភាសាខ្មែរ', code: 'km' },
    ko: { lang_en: 'Korean', lang: '한국어', code: 'ko' },
    lo: { lang_en: 'Lao', lang: 'ພາ​ສາ​ລາວ', code: 'lo' },
    ml: { lang_en: 'Malayalam', lang: 'മലയാളം', code: 'ml' },
    mam: { lang_en: 'Mam', lang: 'Qyol Mam', code: 'mam' },
    mr: { lang_en: 'Marathi', lang: 'मराठी', code: 'mr' },
    mh: { lang_en: 'Marshallese', lang: 'Kajin Ṃajeḷ', code: 'mh' },
    mxb: { lang_en: 'Mixteco Bajo', lang: 'Ñuu savi', code: 'mxb' },
    ne: { lang_en: 'Nepali', lang: 'नेपाली', code: 'ne' },
    om: { lang_en: 'Oromo', lang: 'Oromiffa', code: 'om' },
    ps: { lang_en: 'Pashto', lang: 'پښتو', code: 'ps' },
    pt: { lang_en: 'Portuguese', lang: 'Português', code: 'pt' },
    pa: { lang_en: 'Punjabi', lang: 'ਪੰਜਾਬੀ', code: 'pa' },
    ro: { lang_en: 'Romanian', lang: 'Română', code: 'ro' },
    ru: { lang_en: 'Russian', lang: 'Русский', code: 'ru' },
    sm: { lang_en: 'Samoan', lang: 'Faa-Samoa', code: 'sm' },
    so: { lang_en: 'Somali', lang: 'Af Soomaali', code: 'so' },
    es: { lang_en: 'Spanish', lang: 'Español', code: 'es' },
    sw: { lang_en: 'Swahili', lang: 'Kiswahili', code: 'sw' },
    ta: { lang_en: 'Tamil', lang: 'தமிழ்', code: 'ta' },
    tl: { lang_en: 'Tagalog', lang: 'Tagalog', code: 'tl' },
    te: { lang_en: 'Telugu', lang: 'తెలుగు', code: 'te' },
    th: { lang_en: 'Thai', lang: 'ภาษาไทย', code: 'th' },
    ti: { lang_en: 'Tigrinya', lang: 'ትግርኛ', code: 'ti' },
    to: { lang_en: 'Tongan', lang: 'Lea fakaTonga', code: 'to' },
    tr: { lang_en: 'Turkish', lang: 'Türkçe', code: 'tr' },
    uk: { lang_en: 'Ukrainian', lang: 'Український', code: 'uk' },
    ur: { lang_en: 'Urdu', lang: 'اُردُو', code: 'ur' },
    vi: { lang_en: 'Vietnamese', lang: 'Tiếng Việt', code: 'vi' }
  });

  setContext('locale', locale);
  setContext('locales', locales);

  const MODE_KEY = 'demo_mode';
  let mode = writable('normal');
  window.localStorage[MODE_KEY] ? mode.set(JSON.parse(window.localStorage[MODE_KEY])) : mode.set('normal');

  let isOpen = writable(false);
  setContext('isOpen', isOpen);
  function closeNav() {
    $isOpen = false;
  }

  document.addEventListener('click', (event) => {
    closeNav();
  });
  document.addEventListener('keydown', (event) => {
    closeNav();
  });
  window.addEventListener('scroll', (event) => {
    closeNav();
  });

  $: {
    if ($mode) window.localStorage[MODE_KEY] = JSON.stringify($mode);
  }

  setContext('mode', mode);

</script>

<Container class="main" fluid>
  <Styles />

  <slot />

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
</Container>

<style>
  :global(#nav-image) {
    width: 240px;
    -webkit-transition: all 0.06s linear;
    -moz-transition: all 0.06s linear;
    -o-transition: all 0.06s linear;
    transition: all 0.06s linear;
  }
  :global(.nav-text) {
    font-size:medium;
    -webkit-transition: all 0.06s linear;
    -moz-transition: all 0.06s linear;
    -o-transition: all 0.06s linear;
    transition: all 0.06s linear;
  }
  :global(#nav-image.scrolling) {
    width: 160px !important;
    margin-left: 10px;
  }
  :global(.nav-text.scrolling)  {
    font-size: xx-small;
    color: #000; /* Fallback for older browsers */
    color: rgba(0, 0, 0, 0.0);
  }
  :global(.navbar.scrolling) {
    padding: 0px !important;
  }

  :global(.main-row) {
    flex-grow: 1;
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
