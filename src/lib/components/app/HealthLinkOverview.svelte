<script lang="ts">
  import { getContext } from 'svelte';
  import { Button, Card, CardBody, Col, Icon, Row } from '@sveltestrap/sveltestrap';
  import type { Writable } from 'svelte/store';
  import type { SHLAdminParams, SHLClient } from '$lib/utils/managementClient';
  import { VIEWER_BASE } from '$lib/config/config';

  let shlClient: SHLClient = getContext('shlClient');

  let shlStore: Writable<SHLAdminParams[]> = getContext('shlStore');

  let title: string = 'QR Code Summaries created and shared by me';
</script>

{#if $shlStore.length > 0}
  <Row>
    <Col>
      <h4
        style="padding-left: 0; padding-bottom: 5px; border-bottom: 1px solid rgb(204, 204, 204); margin-bottom: 10px;"
      >
        {title}
      </h4>
    </Col>
  </Row>
  {#each $shlStore as shl, i}
    <Card class="mb-3">
      <CardBody>
        <Row class="align-items-center g-2">
          <Col>
            <Row class="align-items-center g-2">
              <Col sm="auto" class="me-auto">
                {shl.label || `My Summary ${i + 1}`}
              </Col>
              <Col md="auto" class="d-flex flex-wrap gap-2 justify-content-end">
                {#if shl.shlink}
                  <Button class="text-nowrap" color="primary" style="flex: 1 1 auto; min-width: fit-content;" href={VIEWER_BASE + shl.shlink} target="_blank">
                    View Summary <Icon name="box-arrow-up-right"></Icon>
                  </Button>
                {/if}
                <Button class="text-nowrap" color="primary" style="flex: 1 1 auto; min-width: fit-content;" href={'/view/' + shl.id}>
                  Manage and Share <Icon name="gear-wide-connected"></Icon>
                </Button>
              </Col>
            </Row>
          </Col>
          <Col xs="auto" class="justify-content-end">
            <Button color="danger" on:click={async function () {
              let success = await shlClient.deleteShl(shl);
              if (success) {
                $shlStore = await shlClient.getUserShls();
              }
            }}>
              <Icon name="trash3" />
            </Button>
          </Col>
        </Row>
      </CardBody>
    </Card>
  {/each}
{/if}
<br>
