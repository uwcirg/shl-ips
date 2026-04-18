<script lang="ts">
  import { getContext, onDestroy } from 'svelte';
  import type { Writable } from 'svelte/store';

  export let backLabel: string = 'Back';
  export let forwardLabel: string = 'Next';
  export let showBack: boolean = false;
  export let showForward: boolean = false;
  export let onBack: () => void = () => {};
  export let onForward: () => void = () => {};

  interface NavConfig {
    backLabel: string;
    forwardLabel: string;
    showBack: boolean;
    showForward: boolean;
    onBack: () => void;
    onForward: () => void;
  }

  const navConfig = getContext<Writable<NavConfig>>('navConfig');

  $: $navConfig = {backLabel, forwardLabel, showBack, showForward, onBack, onForward };

  onDestroy(() => $navConfig = { ...$navConfig, showBack: false, showForward: false });
</script>