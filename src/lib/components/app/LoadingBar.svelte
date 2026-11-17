<script lang="ts">
  import { Progress } from '@sveltestrap/sveltestrap';

  // Progress of datasets loading in, shown as a bar and a count. Updates on its own as each dataset
  // finishes, independent of when the list below applies the new data.
  export let done = 0;
  export let total = 0;
  let className = '';
  export { className as class };
</script>

<div class={className} role="status" aria-live="polite">
  <div class="d-flex justify-content-between small text-secondary mb-1">
    <span>Loading your data</span>
    <span>{done} of {total} sources</span>
  </div>
  <Progress value={done} max={total} color="primary" style="height: 0.35rem;" aria-label="Loading your data" />
</div>
