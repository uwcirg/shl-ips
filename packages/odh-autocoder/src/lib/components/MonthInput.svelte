<script lang="ts">
  import { Input } from '@sveltestrap/sveltestrap';

  // Value is "YYYY-MM", "YYYY" (year only), or "" when empty or incomplete
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

  // A month input can't show a year without a month, so a year-only value is shown (and edited)
  // with the month select and year field instead. Once shown that way, the field stays that way.
  let hasShownYearOnly = false;
  $: if (/^\d{4}$/.test(value ?? "")) {
    hasShownYearOnly = true;
  }
  $: useMonthInput = supportsMonthInput && !hasShownYearOnly;

  // A year without a month is a year-only date
  function compose(y: string, m: string) {
    if (!/^\d{4}$/.test(y)) {
      return "";
    }
    return m ? `${y}-${m}` : y;
  }

  // Sync from the bound value, without clearing a half-filled month/year while value is still ""
  $: if (!useMonthInput && value !== compose(year, month)) {
    const [, y = "", m = ""] = value?.match(/^(\d{4})(?:-(\d{2}))?/) ?? [];
    year = y;
    month = m;
  }

  function update() {
    value = compose(year, month);
  }
</script>

<div class="month-input d-flex gap-2">
  {#if useMonthInput}
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
