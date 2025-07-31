<script lang="ts">
  import { Badge } from 'sveltestrap';
  import type { Extension } from 'fhir/r4';
  import type { ResourceTemplateParams } from '$lib/utils/types';

  export let content: ResourceTemplateParams<Extension>;
  let extension: Extension
  $: if (content) extension = content.resource;
</script>

{#if extension?.url}
  <Badge color="primary">{extension.url}</Badge><br>
{/if}
{#if extension?.valueString}
  {extension.valueString}
{/if}
