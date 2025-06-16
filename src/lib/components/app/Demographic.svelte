<script lang="ts">
  import { Row, Col, Button, Spinner } from 'sveltestrap';
  import { createEventDispatcher, onMount } from 'svelte';
  import type { ResourceRetrieveEvent } from '$lib/utils/types';
  import { demographics } from '$lib/stores/demographics';
  import DemographicForm from '$lib/components/form/DemographicForm.svelte';
  import AuthService from '$lib/utils/AuthService';
  import type { User } from 'oidc-client-ts';
  import { constructPatientResource } from '$lib/utils/util';

  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  let processing = false;

  let user: User | undefined;

  onMount(async () => {
    console.log(JSON.stringify($demographics));
    if ($demographics.first === "" || $demographics.last === "") {
      let userAuth = await AuthService.Instance.getProfile();
      $demographics.first = userAuth.given_name || userAuth.firstName;
      $demographics.last = userAuth.family_name || userAuth.lastName;
    }
  });

  function generateIPS() {
    processing = true;
    let patient = constructPatientResource($demographics);
    resourceDispatch('update-resources', {
      resources: [patient],
      hostname: 'WA Health Summary'
    });
    
    processing = false;
  }

  function fillDemographics() {
    $demographics = {
      last: "Gravitate",
      first: "Maria SEATTLE",
      gender: "female",
      dob: "1946-05-05"
    }
  }
</script>

<form on:submit|preventDefault={() => generateIPS()}>
  <Row>
    <Col>
      <p>Please update or enter your demographic information below.</p>
      <span> Or,</span>
      <Button
        color="secondary"
        class="ms-2"
        outline
        style="width:fit-content"
        type="button"
        on:click={fillDemographics}
      >
        Fill test patient information
      </Button>
    </Col>
  </Row>
  <Row class="mt-3">
    <Col>
      <DemographicForm hide={['address', 'mrn']} />
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