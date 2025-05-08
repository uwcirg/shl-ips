<script lang="ts">
  import { Row, Col, Button, Spinner } from 'sveltestrap';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { ResourceRetrieveEvent } from '$lib/utils/types';
  import { demographics } from '$lib/stores/demographics';
  import DemographicForm from '$lib/components/form/DemographicForm.svelte';
  import AuthService from '$lib/utils/AuthService';
  import type { User } from 'oidc-client-ts';

  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  let processing = false;

  let user: User | undefined;

  onMount(async () => {
    if (!$demographics.first || !$demographics.last) {
      let userAuth = await AuthService.Instance.getProfile();
      $demographics.first = userAuth.given_name || userAuth.firstName;
      $demographics.last = userAuth.family_name || userAuth.lastName;
    }
  });

  function generateIPS() {
    processing = true;
    let patient = {
      "resourceType" : "Patient",
      "id" : "generatedPatient",
      "text" : {
        "status" : "generated",
        "div" : ""
      },
      "identifier" : [{
        "use" : "usual",
        "type" : {
          "coding" : [{
            "system" : "http://terminology.hl7.org/CodeSystem/v2-0203",
            "code" : "MR"
          }]
        },
        "system" : "urn:oid:1.2.36.146.595.217.0.1",
        "value" : $demographics.mrn,
      }],
      "active" : true,
      "name" : [{
        "use" : "official",
        "family" : $demographics.last,
        "given" : [$demographics.first]
      }],
      "telecom" : [
      {
        "system" : "phone",
        "value" : $demographics.phone,
        "use" : "home",
        "rank" : 1
      }],
      "gender" : $demographics.gender,
      "birthDate" : $demographics.dob,
      "deceasedBoolean" : false,
      "address" : [{
        "use" : "home",
        "type" : "both",
        "text" : `${$demographics.address1} ${$demographics.address2}, ${$demographics.city}, ${$demographics.state} ${$demographics.zip} ${$demographics.country}`,
        "line" : [$demographics.address1, $demographics.address2],
        "city" : $demographics.city,
        "state" : $demographics.state,
        "postalCode" : $demographics.zip
      }]
    }
    resourceDispatch('update-resources', {
      resources: [patient],
      hostname: 'WA Health Summary'
    });
    
    processing = false;
  }
</script>

<form on:submit|preventDefault={() => generateIPS()}>
  <Row>
    <Col>
      <DemographicForm />
    </Col>
  </Row>
  <Row>
    <Col xs="auto">
      <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
        {#if !processing}
          Continue
        {:else}
          Saving...
        {/if}
      </Button>
    </Col>
    {#if processing}
      <Col xs="auto" class="d-flex align-items-center px-0">
        <Spinner color="primary" type="border" size="md"/>
      </Col>
    {/if}
  </Row>
</form>