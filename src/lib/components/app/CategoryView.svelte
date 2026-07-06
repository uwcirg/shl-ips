<script lang="ts">
  import {
    Button,
    Card,
    CardBody,
    CardHeader,
    CardFooter,
    Col,
    Row,
    Icon,
    FormGroup,
    Label,
    Input
  } from '@sveltestrap/sveltestrap';

  let className = '';
  export { className as class };

  export let summary: boolean = false;
  export let title: string = "";
  export let seeAllFn: (() => any) | undefined = undefined;
  export let addFn: (() => any) | undefined = undefined;
  export let sortFields: string[] = [];
  export let filterFields: string[] = [];
  export let searchInput: string = "";

</script>
<Card class={className}>
  <CardHeader>
    <div class="d-flex justify-content-between">
      <h5>{title}</h5>
      {#if summary && seeAllFn}
        <div>
          <Button size="sm" color="secondary" on:click={seeAllFn}>See all</Button>
        </div>
      {/if}
    </div>
  </CardHeader>
  <CardBody>
    {#if !summary}
      <Row>
        <Col>
          <Input type="search" bind:value={searchInput} class="form-control" placeholder="Search" />
        </Col>
      </Row>
      <Row>
        <Col>
          <FormGroup>
            <Label>Sort by:</Label>
            <Input type="select" bind:value={sortFields}>
              {#each filterFields as field}
                <option value={field}>{field}</option>
              {/each}
            </Input>
          </FormGroup>
        </Col>
      </Row>
    {/if}

    <slot name="resources" />

  </CardBody>
  {#if addFn}
  <CardFooter>
    <Button class="w-100" outline size="sm" color="secondary" style="border: 1px dashed" on:click={addFn}><Icon name="plus" /> Add your own</Button>
  </CardFooter>
  {/if}
</Card>
