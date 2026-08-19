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
      {#if addFn}
        <div>
          <Button class="w-100" outline size="sm" color="secondary" style="border: 1px dashed" on:click={addFn}><Icon name="plus" /> Add</Button>
        </div>
      {/if}
    </div>
  </CardHeader>
  <CardBody>
    {#if !summary}
      <div class="mb-3">
        <Row>
          <Col>
            <Input type="search" bind:value={searchInput} class="form-control" placeholder="Search" />
          </Col>
        </Row>
        {#if filterFields.length > 0}
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
      </div>
    {/if}

    <slot name="resources" />

  </CardBody>
  {#if summary && seeAllFn}
    <CardFooter>
      <Button class="w-100" outline size="sm" color="secondary" style="border: 1px dashed" on:click={seeAllFn}>See all {title.toLowerCase()} <Icon name="arrow-right" /></Button>
    </CardFooter>
  {/if}
</Card>
