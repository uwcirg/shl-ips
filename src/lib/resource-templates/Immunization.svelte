<script>
  import {
    Card,
    CardBody
  } from 'sveltestrap';
    export let resource; // Define a prop to pass the data to the component
  </script>
  
  <Card>
    <CardBody>
      <span><b>{resource.occurrenceDateTime}</b></span>
      <br/>
      <span>
        {#if resource.vaccineCode.coding[0].display}
          {resource.vaccineCode.coding[0].display}
        {:else}
          {resource.vaccineCode.text}
        {/if}
      </span>
      <br/>
      <span class="badge badge-primary">{resource.vaccineCode.coding[0].system}</span>{resource.vaccineCode.coding[0].code}
      <br/>
    </CardBody>
  </Card>
  