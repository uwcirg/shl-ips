<script>
  import {
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    CardSubtitle,
    CardText,
    CardTitle,
    Col,
    FormGroup,
    Icon,
    Input,
    Label,
    Modal,
    ModalBody,
    ModalHeader,
    ModalFooter,
    Row
  } from 'sveltestrap';

  export let options; // Define a prop to pass the data to the component
</script>
  
  <Card>
    <CardHeader>
      <a href="#" data-toggle="collapse" data-target="#advanceDirectives-body" aria-expanded="true" class="">
        <i class="icon-action fa fa-chevron-down"></i>
      </a>
      <span class="title"><b>Advance Directives</b></span>
    </CardHeader>
    <CardBody id="advanceDirectives-body">
      <ul class="list-group">
        {#each options.ad as item}
          <li>
            Type: {item.resourceType}
            <br/>
            Text: 
            {#if item.text && item.text.div}
              {item.text.div}
            {:else}
              <i>No text provided in resource</i>
            {/if}
            <br />
            Category:
            {#if item.category && item.category[0] && item.category[0].coding && item.category[0].coding[0]}
              {item.category[0].coding[0].display}
            {/if}
            <br/>
            Intent:
            {#if item.provision && item.provision.code && item.provision.code[0] && item.provision.code[0].coding && item.provision.code[0].coding[0]}
              {item.provision.code[0].coding[0].display}
            {/if}
            {#if item.description && item.description.text}
              {item.description.text}
            {/if}
          </li>
        {/each}
      </ul>
    </CardBody>
  </Card>  