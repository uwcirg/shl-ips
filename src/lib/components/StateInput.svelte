<script lang="ts">
  import {
    Input,
  } from 'sveltestrap';
  export let value: string;
  let states: Array<string> = [
    '',
    'AL','AK','AZ','AR','CA','CO','CT',
    'DC','DE','FL','GA','GU','HI','ID',
    'IL','IN','IA','KS','KY','LA','ME',
    'MD','MA','MI','MH','MN','MP','MS',
    'MO','MT','NE','NV','NH','NJ','NM',
    'NY','NC','ND','OH','OK','OR','PA',
    'PR','RI','SC','SD','TN','TX','UT',
    'VT','VA','VI','WA','WV','WI','WY'
  ];
</script>
<Input type="select" bind:value={value} style="width: 80px">
  {#each states as state}
    <option value={state} style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
      {state}
    </option>
  {/each}
</Input>