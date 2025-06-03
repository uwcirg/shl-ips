<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { Button, Col, Icon, Input, Label, Row, Styles, Table } from 'sveltestrap';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams } from '$lib/utils/managementClient';

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');
  let mode: Writable<string> = getContext('mode');

  let title: string = 'Patient Advance Care Plan Document Lookup';

  let patients;
  let filteredPatients;

  let searchString = "";

  $: {
    if (searchString.length > 2) {
      filteredPatients = patients?.filter((patient) => {
        let name = patient.name?.[0];
        if (name?.given?.[0] && name?.family) {
          let fullName = `${name?.given?.[0]} ${name?.family}`;
          return fullName.toLowerCase().includes(searchString.toLowerCase());
        }
      });
    } else {
      filteredPatients = patients;
    }
  }

  onMount(async () => {
    patients = await fetch("https://fhir.ips-demo.dev.cirg.uw.edu/fhir/Patient?_has:DocumentReference:patient:status=current")
      .then((response) => response.json())
      .then((data) => data.entry)
      .then((data) => data.map((entry) => entry.resource))
      .then((data) => {
        let patientMap = {};
        for (const r of data) {
          let name = r.name?.[0];
          if (name?.given?.[0] && name?.family) {
            let fullName = `${name?.given?.[0]} ${name?.family}`;
            patientMap[fullName] = r; 
          }
        }
        return Object.values(patientMap);
      });
  });
</script>

<Styles />

<Row>
  <Col>
    <h4
      style="padding-left: 0; padding-bottom: 5px; border-bottom: 1px solid rgb(204, 204, 204); margin-bottom: 0px;"
    >
      {title}
    </h4>
  </Col>
</Row>
<Row class="my-4">
  <Col>
    <Input type="text" bind:value={searchString} placeholder="Search by name..." style="width: 200px"/>
  </Col>
</Row>

{#if patients}
  <Table striped>
    <thead>
      <tr>
        <th>First Name</th>
        <th>Last Name</th>
        <th>Date of Birth</th>
        <th></th>
      </tr>
    </thead>
    {#if filteredPatients?.length > 0}
      {#each filteredPatients as patient}
        <tr>
          <td>{patient.name?.[0].given?.[0]}</td>
          <td>{patient.name?.[0].family}</td>
          <td>{patient.birthDate}</td>
          <td>
            <Button size="sm" color="primary" target="_blank" href={'/patient/' + patient.id}>View</Button>
          </td>
        </tr>
      {/each}
    {:else}
      <tr>
        <td colspan="4">No patients found</td>
      </tr>
    {/if}
  </Table>
{/if}
