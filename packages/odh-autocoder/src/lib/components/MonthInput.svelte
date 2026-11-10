<script lang="ts">
  import { Input } from '@sveltestrap/sveltestrap';

  // Value is "YYYY-MM", or "" when empty or incomplete
  export let value: string = "";

  // Browsers without month inputs (e.g. Firefox) coerce type="month" to a text input. A date input
  // can't stand in, since it only has a value once the day is filled in too.
  const supportsMonthInput = (() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'month');
    return input.type === 'month';
  })();

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  let month = "";
  let year = "";

  function compose(y: string, m: string) {
    return /^\d{4}$/.test(y) && m ? `${y}-${m}` : "";
  }

  // Sync from the bound value, without clearing a half-filled month/year while value is still ""
  $: if (!supportsMonthInput && value !== compose(year, month)) {
    [year = "", month = ""] = value?.match(/^(\d{4})-(\d{2})/)?.slice(1) ?? [];
  }

  function update() {
    value = compose(year, month);
  }
</script>

<div class="month-input d-flex gap-2">
  {#if supportsMonthInput}
    <Input type="month" bind:value />
  {:else}
    <select
      class="form-select month-select"
      aria-label="Month"
      value={month}
      on:change={(e) => { month = e.currentTarget.value; update(); }}
    >
      <option value="">Month</option>
      {#each MONTHS as name, i}
        <option value={String(i + 1).padStart(2, '0')}>{name}</option>
      {/each}
    </select>
    <input
      class="form-control year-input"
      type="text"
      inputmode="numeric"
      maxlength="4"
      placeholder="Year"
      aria-label="Year"
      value={year}
      on:input={(e) => { year = e.currentTarget.value.replace(/\D/g, ''); e.currentTarget.value = year; update(); }}
    />
  {/if}
</div>

<style>
  /* Sized to the content: the longest month name ("September") and four digits, plus the
     controls' padding (and the select's arrow). The month select can shrink on very narrow screens, but the year field keeps its width. */
  .month-input {
    flex: 0 1 auto;
    min-width: 0;
  }
  .month-input > :global(input[type="month"]) {
    min-width: 0;
  }
  .month-select {
    flex: 0 1 auto;
    width: calc(9ch + 3.25rem);
    min-width: 0;
  }
  .year-input {
    flex: 0 0 auto;
    width: calc(4ch + 1.75rem);
    min-width: 0;
  }
</style>
