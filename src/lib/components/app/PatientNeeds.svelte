<script lang="ts">
  import {
    Button,
    Col,
    FormGroup,
    Input,
    Label,
    Row,
    Spinner
  } from 'sveltestrap';
  import { createEventDispatcher } from 'svelte';
  import { constructPatientResource } from '$lib/utils/util';
  import type { ResourceRetrieveEvent } from '$lib/utils/types';

  let processing = false;
  let fetchError = '';
  // Concerns
  let concern_visual = false;
  let concern_audio = false;
  let concern_cognition = false;
  let concern_speaking = false;
  let concern_mobility = false;
  let concern_gender = false;
  let concern_memory = false;
  let concern_trauma = false;
  let concern_focus = false;
  let concern_addiction = false;
  let concern_city = false;
  // Help
  let eating = false;
  let toileting = false;
  let bed_exit = false;
  let bed_in = false;
  let orientation = false;
  let dressing = false;
  let bathing = false;
  let meds = false;
  let reading = false;
  // Aids
  let dog = false;
  let wheelchair = false;
  let comm_device = false;

  let additionalInfo = '';
    
  const resourceDispatch = createEventDispatcher<{'update-resources': ResourceRetrieveEvent}>();

  function prepareIps() {
    const resources = constructPatientResource();
    resourceDispatch('update-resources', resources);
  }
</script>
<form on:submit|preventDefault={() => prepareIps()}>
  <h5>My functional and identity needs</h5>
  <FormGroup>
    <Label><b>Functional / Identity Flags</b> I would like my carers to be aware of my concerns around:</Label>
    <Input type="checkbox" name="concern-visual" value="true" label="Vision"/>
    <Input type="checkbox" name="concern-audio" value="true" label="Hearing / Listening"/>
    <Input type="checkbox" name="concern-cognition" value="true" label="Cognition / thinking / understanding / information processing"/>
    <Input type="checkbox" name="concern-speaking" value="true" label="Speaking / communicating / Conversation / Verbal interactions"/>
    <Input type="checkbox" name="concern-mobility" value="true" label="Mobility / moving myself around"/>
    <Input type="checkbox" name="concern-gender" value="true" label="Use of gender specific areas"/>
    <Input type="checkbox" name="concern-memory" value="true" label="Memory"/>
    <Input type="checkbox" name="concern-trauma" value="true" label="Past Trauma"/>
    <Input type="checkbox" name="concern-focus" value="true" label="Staying focused / Concentration"/>
    <Input type="checkbox" name="concern-addiction" value="true" label="Managing my addiction(s)"/>
    <Input type="checkbox" name="concern-city" value="true" label="I am from a small and/or remote community and cities and/or lots of people are an unfamiliar environment for me."/>
  </FormGroup>
  
  <FormGroup>
    <Label><b>I may need help with:</b></Label>
    <Input type="checkbox" name="eating" value="true" label="Eating / Drinking"/>
    <Input type="checkbox" name="toileting" value="true" label="Toileting"/>
    <Input type="checkbox" name="bed-exit" value="true" label="Getting out of bed"/>
    <Input type="checkbox" name="bed-in" value="true" label="Moving in bed"/>
    <Input type="checkbox" name="orientation" value="true" label="Getting orientated in a new environment"/>
    <Input type="checkbox" name="dressing" value="true" label="Dressing"/>
    <Input type="checkbox" name="bathing" value="true" label="Bathing / Cleaning"/>
    <Input type="checkbox" name="meds" value="true" label="Taking my medications"/>
    <Input type="checkbox" name="reading" value="true" label="Reading Documentation"/>
  </FormGroup>
  
  <FormGroup>    
    <Label><b>I have:</b></Label>
    <Input type="checkbox" name="dog" value="true" label="A Guide Dog"/>
    <Input type="checkbox" name="wheelchair" value="true" label="A Wheelchair"/>
    <Input type="checkbox" name="comm-device" value="true" label="A Communication Device"/>
  </FormGroup>

  <FormGroup>
    <Label>Anything else you want to say about your general care needs or anxieties, or to explain any of the boxes you ticked above:</Label>
    <Input type="textarea" bind:value={additionalInfo} rows="5" />
  </FormGroup>

  <Row>
    <Col xs="auto">
      <Button color="primary" style="width:fit-content" disabled={processing} type="submit">
        {#if !processing}
          Update your care needs
        {:else}
          Adding...
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