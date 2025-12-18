<script lang="ts">
  import {
    Input,
  } from '@sveltestrap/sveltestrap';
  export let value: string;

  let genderOptions: Record<string, any> = {
    "": '',
    "female": 'Female',
    "male": 'Male',
    "other": 'Other'
  };
</script>
<Input type="select" bind:value={value} style="width: 100px">
  {#each Object.entries(genderOptions) as [value, display]}
    <option value={value} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
      {display}
    </option>
  {/each}
</Input>