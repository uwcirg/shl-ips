<script lang="ts">
  import {
    Badge,
    Card,
    CardHeader,
    CardBody,
    CardText,
    CardTitle,
    CardSubtitle,
    Col,
    Dropdown,
    DropdownToggle,
    Icon,
    Row,
  } from '@sveltestrap/sveltestrap';
  import { get, type Writable } from 'svelte/store';
  import { METHOD_NAMES } from '$lib/config/config';
  import { ResourceCollection } from '$lib/utils/ResourceCollection';
  import { StateManager } from '$lib/utils/StateManager';
  import type { Patient } from 'fhir/r4';

  export let dataset: { status: StateManager, collection: ResourceCollection };
  export let masterPatient: Writable<Patient>;

  let collection: ResourceCollection;
  let category: string;
  let method: string;
  let source: string;
  let sourceName: string;
  let placeholder: string;
  let patient: Patient;
  
  $: {
    if (dataset) {
      ({ status, collection } = dataset);
      ({ category, method, source, sourceName, placeholder } = collection.getTags());
      patient = get(collection.patient) as Patient;
    }
  }
</script>

<Card class="{category}-dataset h-100 w-100">
  <CardHeader>
    <Row class="align-items-center">
      <Col>
        <CardText style="max-width: 100%;">
          <Icon name="calendar-check"/> {new Date(patient.meta.lastUpdated).toLocaleString(undefined, {
            dateStyle: "medium",
          })}
        </CardText>
      </Col>
      {#if $$slots.menu}
        <Col class="ps-0" style="max-width: fit-content">
          <Dropdown>
            <DropdownToggle tag="div" style="cursor: pointer">
              <Icon name="three-dots-vertical" style="cursor: pointer"></Icon>
            </DropdownToggle>
            <slot name="menu" />
          </Dropdown>
        </Col>
      {/if}
    </Row>
  </CardHeader>
  <CardBody class="d-flex flex-column justify-content-between">
    <div>
      <Row class="align-items-top">
        <Col>
          <CardTitle
            title={source}
            style="max-width: 100%; overflow-wrap: anywhere;"
          >
            {sourceName}
          </CardTitle>
        </Col>
      </Row>
      <Row>
        <CardSubtitle class="mb-1 text-secondary">
          For {
            placeholder ?
              `${$masterPatient?.resource?.name?.[0]?.given?.join(" ")} ${$masterPatient?.resource?.name?.[0]?.family}` :
              `${patient.name?.[0]?.given?.join(" ")} ${patient.name?.[0]?.family}`
          }
        </CardSubtitle>
      </Row>
      <Row>
        <Col class="pe-0">
          <Badge color="secondary">
            {METHOD_NAMES[method]?.name || "Unknown"}
          </Badge>
        </Col>
      </Row>
    </div>
    <Row class="mx-0 mt-3">
      <slot name="footer" />
    </Row>
  </CardBody>
</Card>