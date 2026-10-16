<script context="module" lang="ts">
  // Gives each IPSContent on a page its own element ids (several can be mounted in tabs)
  let instanceCounter = 0;
</script>

<script lang="ts">
  import {
    Button,
    ButtonGroup,
    Card,
    CardBody,
    Col,
    Icon,
    Offcanvas,
    Row,
  } from '@sveltestrap/sveltestrap';
  import type {
    Bundle,
    Composition,
    CompositionSection,
    Resource
  } from "fhir/r4";
  import { getContext, onDestroy } from 'svelte';
  import { readable, type Readable } from 'svelte/store';
  import { download } from '$lib/utils/util.js';
  import UnitDisplay from '$lib/components/app/UnitDisplay.svelte';
  import SectionExtension from '$lib/components/resource-templates/SectionExtension.svelte';
  import type { IAuthService } from '$lib/utils/types';
  import { createCategorizedStore, type UnitMap } from '$lib/stores/categorizedResources';
  import { createIpsCategorizer, type IpsSectionInput } from '$lib/utils/ipsCategorizer';

  export let bundle: Bundle;
  export let displayMode: string; // 'app' renders resources, 'text' renders section narratives
  export let codeBadges: 'always' | 'never' | 'advanced' = 'never';
  // 'advanced' shows View buttons only in advanced mode; 'always' shows them in every mode (e.g. the demo)
  export let viewButtons: 'always' | 'advanced' = 'advanced';

  const mode: Readable<string> = getContext('mode') ?? readable('');

  // When signed in, the app shows a floating tab bar over the top of the page while scrolling
  // (same condition as in Header), so the sticky menu and section jumps need to clear it.
  const authService = getContext<IAuthService | undefined>('authService');
  const authenticated: Readable<boolean> = authService?.authenticated ?? readable(false);
  const user = authService?.user ?? readable(null);
  $: signedIn = !!($authenticated && $user);
  $: showViewButtons = viewButtons === 'always' || $mode === 'advanced';

  type IpsSection = IpsSectionInput & { section: CompositionSection };

  // Display units per section title, from the same categorized store the data views use. The
  // IPS categorizer assigns each resource to the section that lists it, in Composition order.
  let ipsSections: IpsSection[] = [];
  let unitsStore: Readable<UnitMap> = readable({});
  $: if (bundle) {
    ipsSections = getIpsSections(bundle);
    const { input, categorize, sort } = createIpsCategorizer(bundle, ipsSections);
    unitsStore = createCategorizedStore(readable(input), { categorize, sort }).unitsStore;
  }

  // The Patient first, then the Composition's sections in SECTION_ORDER
  // Sections display in this order, matched by section code (LOINC) so titles can vary. Any
  // other section comes after them, alphabetically by title, so sections added in the future
  // still appear.
  const SECTION_ORDER = [
    "81338-6",  // Patient Story
    "104605-1", // Alerts
    "11450-4",  // Problem List
    "48765-2",  // Allergies and Intolerances
    "10160-0",  // Medication List
    "42348-3",  // Advance Directives
    "11369-6",  // History of Immunizations
    "30954-2",  // Diagnostic Results
    "47519-4",  // History of Procedures
    "46264-8",  // Medical Devices
    "18776-5",  // Plan of Care
    "47420-5",  // Functional Status
    "11348-0",  // History of Past Problems
    "10162-6",  // History of Pregnancy
    "29762-2",  // Social History
    "8716-3"    // Vital Signs
  ];

  function sectionRank(section: CompositionSection) {
    const codes = section.code?.coding?.map((coding) => coding.code) ?? [];
    const ranks = codes.map((code) => SECTION_ORDER.indexOf(code ?? "")).filter((rank) => rank !== -1);
    return ranks.length > 0 ? Math.min(...ranks) : SECTION_ORDER.length;
  }

  function getIpsSections(ips: Bundle): IpsSection[] {
    let sections: IpsSection[] = [];
    let compositions = ips.entry?.filter((entry) => entry.resource?.resourceType === 'Composition');
    if (!compositions || !compositions[0]) {
      return sections;
    }
    let composition = compositions[0].resource as Composition;
    composition.section?.forEach((section) => {
      let title = (section.title ?? section.code?.coding?.[0].display) ?? "[Untitled section]";
      sections.push({
        title,
        // Composition.section.entry references, resolved against the whole bundle
        references: section.entry?.map((entry) => entry.reference).filter((reference): reference is string => !!reference) ?? [],
        section
      });
    });
    sections.sort((a, b) =>
      sectionRank(a.section) - sectionRank(b.section) || a.title.localeCompare(b.title)
    );

    // The Patient is not an IPS section, so it is constructed and always comes first
    let patient = ips.entry?.filter((entry) => entry.resource?.resourceType === 'Patient').map((entry) => entry.resource);
    if (patient?.[0]) {
      let patientName = patient[0].name?.[0]?.text ??
        `${patient[0].name?.[0]?.prefix ?? ""} ${patient[0].name?.[0]?.given?.join(' ') ?? ""} ${patient[0].name?.[0]?.family ?? ""}`;
      sections.unshift({
        title: "Patient",
        resources: patient as Resource[],
        section: {
          text: {
            status: 'generated',
            div: patient[0].text?.div ??
                `<b>${patientName}</b><br>
                  Birth Date: ${patient[0].birthDate ?? ""}<br>
                  Gender: ${patient[0].gender ?? ""}`
          }
        }
      });
    }
    return sections;
  }

  // --- Section navigation ---------------------------------------------------------------
  // The URL fragment carries the SHL so the menu uses
  // buttons and scrollIntoView instead of #anchor links.
  const uid = `ips${++instanceCounter}`;
  const sectionDomId = (index: number) => `${uid}-section-${index}`;

  let activeTitle: string | undefined;
  $: if (ipsSections.length > 0 && (activeTitle === undefined || !ipsSections.some(({ title }) => title === activeTitle))) {
    activeTitle = ipsSections[0].title;
  }

  // Scroll-spy: the active section is the first (in display order) crossing the top part of the viewport
  const visibleTitles = new Set<string>();
  // A jump from the menu keeps its section active while the page scrolls there
  let lockUntil = 0;
  const observer = typeof IntersectionObserver === 'undefined'
    ? undefined
    : new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const title = (entry.target as HTMLElement).dataset.sectionTitle;
          if (title === undefined) continue;
          if (entry.isIntersecting) visibleTitles.add(title); else visibleTitles.delete(title);
        }
        if (performance.now() < lockUntil) return;
        const current = ipsSections.find(({ title }) => visibleTitles.has(title));
        if (current) activeTitle = current.title;
      }, { rootMargin: '0px 0px -75% 0px' });
  onDestroy(() => observer?.disconnect());

  function trackSection(node: HTMLElement, title: string) {
    node.dataset.sectionTitle = title;
    observer?.observe(node);
    return {
      update(newTitle: string) {
        visibleTitles.delete(node.dataset.sectionTitle ?? '');
        node.dataset.sectionTitle = newTitle;
      },
      destroy() {
        observer?.unobserve(node);
        visibleTitles.delete(node.dataset.sectionTitle ?? '');
      }
    };
  }

  function jumpTo(title: string, index: number) {
    const section = document.getElementById(sectionDomId(index));
    if (!section) return;
    activeTitle = title;
    lockUntil = performance.now() + 800;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    // Move focus with the view so keyboard and screen reader users land on the section
    section.querySelector<HTMLElement>('.ips-section-title')?.focus({ preventScroll: true });
  }

  let showInfo = false;
  let infoMessage = "";

  function showInfoMessage(message:string) {
    infoMessage = message;
    showInfo = true;
  }

  function hideInfoMessage() {
    showInfo = false;
    infoMessage = "";
  }

  let json = "";
  let resourceType = "";
  let isOpen = false;
  function setJson(resource:any) {
      json = JSON.stringify(resource, null, 2);
      resourceType = resource.resourceType;
      isOpen = true;
  }
  function toggle() {
      isOpen = !isOpen;
  }
</script>

<Offcanvas
    {isOpen}
    {toggle}
    scroll={false}
    header={resourceType + " JSON"}
    placement="end"
    title={resourceType + " JSON"}
    style="display: flex;  overflow-y:hidden; height: 100dvh;"
>
    <Row class="d-flex" style="height: 100%">
            <Row class="d-flex pe-0" style="height:calc(100% - 50px)">
                <Col class="d-flex pe-0" style="height:100%">
                    <div class="d-flex pe-0 pb-0 code-container">
                        <pre class="code"><code>{json}</code></pre>
                    </div>
                </Col>
            </Row>
            <Row class="d-flex pe-0" style="height:50px">
                <Col class="d-flex justify-content-start align-items-end" style="padding-top: 1rem">
                    <ButtonGroup>
                        <Button
                            size="sm"
                            color="primary"
                            on:click={() => navigator.clipboard.writeText(json)}
                        ><Icon name="clipboard" /> Copy</Button>
                        <Button
                            size="sm"
                            outline
                            color="secondary"
                            on:click={() => download(resourceType + ".json", json)}
                        ><Icon name="download" /> Download</Button>
                      </ButtonGroup>
                </Col>
            </Row>
    </Row>
</Offcanvas>

{#if showInfo}
  <Row class="text-info">{infoMessage}</Row>
{/if}
<div class="ips-layout" class:signed-in={signedIn}>
  <nav class="ips-nav" aria-label="Sections">
    <ul class="list-unstyled mb-0">
      {#each ipsSections as { title }, index}
        {@const count = ($unitsStore[title] ?? []).length}
        <li>
          <button
            type="button"
            class="ips-nav-item"
            class:active={title === activeTitle}
            aria-current={title === activeTitle ? 'true' : undefined}
            on:click={() => jumpTo(title, index)}
          >
            <span>{title}</span>
            {#if count > 0 && displayMode !== "text"}<span class="ips-count">{count}</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  </nav>

  <div class="ips-sections">
    {#each ipsSections as { title, section }, index}
      {@const units = $unitsStore[title] ?? []}
      <!-- Fall back to the section narrative when nothing could be rendered (e.g. an empty section) -->
      {@const showNarrative = displayMode === "text" || (units.length === 0 && !section.extension?.length)}
      <section
        id={sectionDomId(index)}
        class="ips-section"
        aria-labelledby={`${sectionDomId(index)}-title`}
        use:trackSection={title}
      >
        <h2 id={`${sectionDomId(index)}-title`} class="ips-section-title" tabindex="-1">
          {title}
          {#if !showNarrative && units.length > 0}<span class="ips-count">{units.length}</span>{/if}
        </h2>
        {#if showNarrative}
          {#if section.text?.div}
            {@html section.text?.div}
          {:else}
            No text available
          {/if}
        {:else}
          {#if section.extension}
            {#each section.extension as extension}
              <Card style="width: 100%; max-width: 100%" class="mb-2">
                <CardBody>
                  <Row class="overflow-auto d-flex justify-content-end align-content-center">
                    <Col class="flex-grow-1" style="overflow:hidden">
                      <svelte:component
                        this={SectionExtension}
                        content={{resource: extension, entries: bundle.entry}}
                      />
                    </Col>
                  </Row>
                </CardBody>
              </Card>
            {/each}
          {/if}
          {#if units.length > 0}
            <Card style="width: 100%; max-width: 100%" class="mb-2">
              {#each units as unit, index}
                <CardBody class={index > 0 ? "border-top" : ""}>
                  <Row style="overflow:hidden" class="d-flex justify-content-end align-content-center">
                    <Col class="overflow-auto justify-content-center align-items-center">
                      <UnitDisplay
                        {unit}
                        entries={bundle.entry}
                        {codeBadges}
                        advanced={showViewButtons}
                        onView={(rh) => setJson(rh.resource)}
                      />
                    </Col>
                    <Col class="d-flex justify-content-end align-items-center" style="max-width: fit-content">
                      {#if showViewButtons && unit.kind === 'single'}
                        <Button
                          size="sm"
                          color="secondary"
                          outline
                          on:click={() => setJson(unit.item.rh.resource)}
                        >
                          View
                        </Button>
                      {/if}
                    </Col>
                  </Row>
                </CardBody>
              {/each}
            </Card>
          {/if}
        {/if}
      </section>
    {/each}
  </div>
</div>

<style>
  .ips-layout {
    /* Space the floating app tab bar takes at the top of the viewport while scrolling. It only
       exists when signed in, and from sm up (signed-in phones get a bottom bar instead). */
    --ips-overlay: 0px;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 1.5rem;
    padding-top: 1rem;
  }
  @media (min-width: 576px) {
    .ips-layout.signed-in {
      --ips-overlay: var(--header-height, 64px);
    }
  }
  /* The section menu is shown from md up; a mobile menu is a separate piece */
  .ips-nav {
    display: none;
  }
  @media (min-width: 768px) {
    .ips-layout {
      grid-template-columns: 13rem minmax(0, 1fr);
    }
    .ips-nav {
      display: block;
      position: sticky;
      top: calc(var(--ips-overlay) + 1rem);
      align-self: start;
      max-height: calc(100vh - var(--ips-overlay) - 2rem);
      overflow-y: auto;
    }
  }
  .ips-nav-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.4rem 0.65rem;
    border: 0;
    border-left: 3px solid transparent;
    border-radius: 0.375rem;
    background: none;
    color: var(--bs-body-color);
    font-size: 0.9rem;
    text-align: left;
    cursor: pointer;
  }
  .ips-nav-item:hover {
    background-color: var(--bs-tertiary-bg, #f8f9fa);
  }
  .ips-nav-item.active {
    border-left-color: var(--bs-primary);
    background-color: var(--bs-secondary-bg, #e9ecef);
    font-weight: 600;
  }
  .ips-count {
    flex: 0 0 auto;
    font-size: 0.75rem;
    font-weight: 400;
    color: var(--bs-secondary-color, #6c757d);
  }
  .ips-section + .ips-section {
    margin-top: 1.75rem;
  }
  /* Where a jump to a section lands, clear of the floating tab bar when there is one */
  .ips-section {
    scroll-margin-top: calc(var(--ips-overlay) + 1.25rem);
  }
  .ips-section-title {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.4rem;
    border-bottom: 2px solid var(--bs-border-color, #dee2e6);
    font-size: 1.3rem;
    font-weight: 600;
  }
  .ips-section-title:focus {
    outline: none;
  }
  .ips-section-title:focus-visible {
    outline: 2px solid var(--bs-primary);
    outline-offset: 2px;
  }
  .ips-section-title .ips-count {
    font-size: 0.9rem;
  }
</style>
