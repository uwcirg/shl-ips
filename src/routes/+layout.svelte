<script lang="ts">
  import {
    Container,
    Row,
    Col,
    Styles
  } from 'sveltestrap';
  import { onMount, onDestroy, setContext } from 'svelte';
  import {writable, type Writable, readable, type Readable } from 'svelte/store';
  import { AuthService } from '$lib/utils/AuthService';
  import type { Language } from '$lib/utils/types';
  import { SHLClient, type SHLAdminParams } from '$lib/utils/managementClient';
  import Header from '$lib/components/layout/Header.svelte';
  import Footer from '$lib/components/layout/Footer.svelte';

  const locale: Writable<string> = writable('en');
  setContext('locale', locale);

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
  setContext('locales', locales);

  let shlStore = writable<SHLAdminParams[]>([]);
  setContext('shlStore', shlStore);

  let authService = AuthService.Instance;
  setContext('authService', authService);

  let shlClient = new SHLClient(authService);
  setContext('shlClient', shlClient);

  let reset = writable(0);
  setContext('reset', reset);

  const MODE_KEY = 'demo_mode';
  let mode = writable('normal');
  window.localStorage[MODE_KEY] ? mode.set(JSON.parse(window.localStorage[MODE_KEY])) : mode.set('normal');
  setContext('mode', mode);

  let isOpen = writable(false);
  setContext('isOpen', isOpen);

  $: {
    if ($mode) window.localStorage[MODE_KEY] = JSON.stringify($mode);
  }

  let prevPageSize: number | undefined;
  // Toggle class based on window width
  function dispatchPageSize() {
    var width = window.innerWidth
    let border = 800;
    if (width < border && (prevPageSize === undefined || prevPageSize >= border)) {
      window.dispatchEvent(new CustomEvent('page-sm', {
        detail: {}
      }));
    } else if (width >= border && (prevPageSize === undefined || prevPageSize < border)) {
      window.dispatchEvent(new CustomEvent('page-md', {
        detail: {}
      }));
    }
    prevPageSize = width;
  }

  onMount(() => {
    // Initial call to set pagination size on page load
    dispatchPageSize()

    // Call dispatchPageSize() on window resize
    window.addEventListener('resize', dispatchPageSize);

    authService.getUser().then((user) => {
      if (user) {
        let now = Date.now() / 1000;
        if ((user.expires_at ?? 0) < now) {
          return user ?? undefined;
        }
      }
    }).then(async (user) => {
      window.dispatchEvent(new CustomEvent('userFound', { 
        detail: { message: 'Hello from another component!' } 
      }));
      $shlStore = await shlClient.getUserShls();
      return user;
    });
  });
  onDestroy(() => {
    window.removeEventListener('resize', dispatchPageSize);
  });

</script>

<Container class="main" fluid>
  <Styles />
  <Header />
  <div class="main-content">
    <slot />
  </div>
  <Footer />
</Container>

<style>
  :global(.main-content) {
    flex-grow: 1;
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
