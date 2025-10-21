<script lang='ts'>
  import { TabContent, TabPane } from 'sveltestrap';
  import { createEventDispatcher } from 'svelte';
  import type { ResourceHelper, ResourceRetrieveEvent } from '$lib/utils/types';
  import PatientInfo from '$lib/components/app/PatientInfo.svelte';
  import PatientStory from '$lib/components/app/PatientStory.svelte';
  import PatientMedical from '$lib/components/app/PatientMedical.svelte';
  import PatientAdvocate from '$lib/components/app/PatientAdvocate.svelte';
  import PatientNeeds from '$lib/components/app/PatientNeeds.svelte';
  import PatientBody from '$lib/components/app/PatientBody.svelte';

  export let patient: Record<string, ResourceHelper>;

  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  function passUpdatedResources(details: ResourceRetrieveEvent) {
    resourceDispatch('update-resources', details);
  }

</script>

<TabContent>
  <TabPane class="patient-tab" tabId="patient" style="padding-top:10px" active>
    <span class="patient-tab" slot="tab">About Me</span>
    <PatientInfo
      patient={patient}
      on:update-resources={ async ({ detail }) => { passUpdatedResources(detail) } }
    />
  </TabPane>
  <TabPane active class="story-tab" tabId="story" style="padding-top:10px">
    <span class="story-tab" slot="tab">My Story</span>
    <PatientStory
      on:update-resources={ async ({ detail }) => { passUpdatedResources(detail) } }
    />
  </TabPane>
  <TabPane class="medical-tab" tabId="medical" style="padding-top:10px">
    <span class="medical-tab" slot="tab">Medical History</span>
    <PatientMedical
      on:update-resources={ async ({ detail }) => { passUpdatedResources(detail) } }
    />
  </TabPane>
  <TabPane class="advocate-tab" tabId="advocate" style="padding-top:10px">
    <span class="advocate-tab" slot="tab">Care Planning</span>
    <PatientAdvocate
      on:update-resources={ async ({ detail }) => { passUpdatedResources(detail) } }
    />
  </TabPane>
  <TabPane class="needs-tab" tabId="needs" style="padding-top:10px">
    <span class="needs-tab" slot="tab">Care Needs</span>
    <PatientNeeds
      on:update-resources={ async ({ detail }) => { passUpdatedResources(detail) } }
    />
  </TabPane>
  <TabPane class="body-tab" tabId="body" style="padding-top:10px">
    <span class="body-tab" slot="tab">My Body</span>
    <PatientBody
      on:update-resources={ async ({ detail }) => { passUpdatedResources(detail) } }
    />
</TabPane>
</TabContent>