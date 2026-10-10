<script lang="ts">
  import {
    Accordion,
    AccordionItem,
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
  import { getContext } from 'svelte';
  import { readable, type Readable } from 'svelte/store';
  import { download } from '$lib/utils/util.js';
  import UnitDisplay from '$lib/components/app/UnitDisplay.svelte';
  import SectionExtension from '$lib/components/resource-templates/SectionExtension.svelte';
  import { createCategorizedStore, type UnitMap } from '$lib/stores/categorizedResources';
  import { createIpsCategorizer, type IpsSectionInput } from '$lib/utils/ipsCategorizer';

  export let bundle: Bundle;
  export let displayMode: string; // 'app' renders resources, 'text' renders section narratives
  export let codeBadges: 'always' | 'never' | 'advanced' = 'never';
  // 'advanced' shows View buttons only in advanced mode; 'always' shows them in every mode (e.g. the demo)
  export let viewButtons: 'always' | 'advanced' = 'advanced';

  const mode: Readable<string> = getContext('mode') ?? readable('');
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
  $: ipsContent = Object.fromEntries(ipsSections.map(({ title, section }) => [title, { section }]));

  // The Patient first, then the Composition's sections
  function getIpsSections(ips: Bundle): IpsSection[] {
    let sections: IpsSection[] = [];
    let compositions = ips.entry?.filter((entry) => entry.resource?.resourceType === 'Composition');
    if (!compositions || !compositions[0]) {
      return sections;
    }
    let patient = ips.entry?.filter((entry) => entry.resource?.resourceType === 'Patient').map((entry) => entry.resource);
    if (patient?.[0]) {
      let patientName = patient[0].name?.[0]?.text ??
        `${patient[0].name?.[0]?.prefix ?? ""} ${patient[0].name?.[0]?.given?.join(' ') ?? ""} ${patient[0].name?.[0]?.family ?? ""}`;
      sections.push({
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
    return sections;
  }

  // Sections display in this order, matched by title (ignoring case). Any other section comes
  // after them, alphabetically, so sections added in the future still appear.
  const SECTION_ORDER = [
    "Patient",
    "Patient Story",
    "Alerts",
    "Problem List",
    "Allergies and Intolerances",
    "Medication List",
    "Advance Directives",
    "History of Immunizations",
    "Diagnostic Results",
    "History of Procedures",
    "Medical Devices",
    "Plan of Care",
    "Functional Status",
    "History of Past Problems",
    "History of Pregnancy",
    "Social History",
    "Vital Signs"
  ].map((title) => title.toLowerCase());

  function sectionRank(title: string) {
    const rank = SECTION_ORDER.indexOf(title.trim().toLowerCase());
    return rank === -1 ? SECTION_ORDER.length : rank;
  }

  function getSections(content: Record<string, { section: CompositionSection }>) {
    return Object.entries(content).sort((a, b) =>
      sectionRank(a[0]) - sectionRank(b[0]) || a[0].localeCompare(b[0])
    );
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
{#each getSections(ipsContent) as [title, sectionContent]}
  {@const units = $unitsStore[title] ?? []}
  <!-- Fall back to the section narrative when nothing could be rendered (e.g. an empty section) -->
  {@const showNarrative = displayMode === "text" || (units.length === 0 && !sectionContent.section.extension?.length)}
  <Row class="mx-0">
    <!--wrap in accordion with title-->
    <Accordion class="mt-3">
      <AccordionItem active class="resource-content">
        <h6 slot="header" class="my-2">{title}</h6>
        {#if showNarrative}
          {#if sectionContent.section.text?.div}
            {@html sectionContent.section.text?.div}
          {:else}
            No text available
          {/if}
        {:else}
          {#if sectionContent.section.extension}
            {#each sectionContent.section.extension as extension}
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
      </AccordionItem>
    </Accordion>
  </Row>
{/each}
