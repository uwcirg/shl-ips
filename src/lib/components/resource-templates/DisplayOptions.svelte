<script lang="ts">
  import { getContext, setContext } from 'svelte';
  import { derived, readable, writable, type Readable } from 'svelte/store';
  import { DISPLAY_OPTIONS, type DisplayOptions } from '$lib/components/resource-templates/displayOptions';

  // Provides display options (currently code badges) to the templates rendered inside.
  // 'always' shows code badges, 'advanced' shows them only in advanced mode, 'never' hides them.
  // With neither prop set, an enclosing provider's setting is inherited (and 'never' is used
  // when there isn't one), so nested displays don't reset what the page asked for.
  export let codeBadges: 'always' | 'never' | 'advanced' | undefined = undefined;
  // Explicit per-instance override; takes precedence over codeBadges when set.
  export let showCodes: boolean | undefined = undefined;

  const inherited = getContext<DisplayOptions | undefined>(DISPLAY_OPTIONS);
  const mode: Readable<string> = getContext('mode') ?? readable('');
  const setting = writable({ codeBadges, showCodes });
  $: setting.set({ codeBadges, showCodes });

  const showCodeBadges = derived([setting, mode], ([$s, $mode]) =>
    $s.showCodes ?? ($s.codeBadges === 'always' || ($s.codeBadges === 'advanced' && $mode === 'advanced'))
  );
  if (!(inherited && codeBadges === undefined && showCodes === undefined)) {
    setContext<DisplayOptions>(DISPLAY_OPTIONS, { showCodeBadges });
  }
</script>

<slot />
