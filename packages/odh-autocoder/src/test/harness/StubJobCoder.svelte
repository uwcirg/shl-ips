<script lang="ts">
  import type { IOResponse } from '$lib';

  // A job coder that codes both fields with one click, standing in for an app's own coder. Has
  // the job coder props: occupation, industry, idPrefix, tense, labels.

  export let occupation: IOResponse | undefined;
  export let industry: IOResponse | undefined;
  export let idPrefix: string;
  export let tense: 'current' | 'past';
  export let labels: Record<string, string> = {};
</script>

<button
  id={`${idPrefix}-stub`}
  data-tense={tense}
  data-labels={JSON.stringify(labels)}
  on:click={() => {
    occupation = { Code: '29-1141', Title: 'Registered Nurses', Score: 1 };
    industry = { Code: '622000', Title: 'Hospitals', Score: 1 };
  }}
>
  Code as nurse
</button>
