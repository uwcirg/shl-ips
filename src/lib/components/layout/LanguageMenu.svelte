<script lang="ts">
    import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Icon } from 'sveltestrap';
    // import { locale } from 'svelte-i18n'; // TODO
    import { getContext } from 'svelte';
    import type { Writable, Readable } from 'svelte/store';
    import type { Language } from '$lib/utils/types';

    let locale: Writable<string> = getContext('locale');
    let locales: Readable<Record<string, Language>> = getContext('locales');
</script>

<Dropdown nav inNavbar class="navbar-dropdown" size="sm" direction="down">
  <DropdownToggle color="primary" nav caret>
    <Icon name="globe2" />
    {$locales[$locale].lang}
  </DropdownToggle>
  <DropdownMenu end style="height: 500px; overflow:auto">
    {#if $locales}
      {#each Object.values($locales) as loc}
        <DropdownItem
          style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"
          on:click={() => {
            $locale = loc.code;
          }}
        >
          {`${loc.lang_en}${loc.lang_en !== loc.lang ? ' - ' + loc.lang : ''}`}
        </DropdownItem>
      {/each}
    {/if}
  </DropdownMenu>
</Dropdown>
