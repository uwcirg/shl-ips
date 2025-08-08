<script lang="ts">
  import {
    Input,
  } from '@sveltestrap/sveltestrap';
  export let value: string;
  let gender: string;
  $: value = genders[gender];
  let genders: Record<string, any> = {
    "": '',
    "Female": 'female',
    "Male": 'male',
    "Other": 'other'
  };
</script>
<Input type="select" bind:value={gender} style="width: 100px">
  {#each Object.keys(genders) as full}
    <option value={full} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
      {full}
    </option>
  {/each}
</Input>