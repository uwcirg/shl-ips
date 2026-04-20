<script lang="ts">
  import { getContext, onDestroy } from 'svelte';
  import type { Writable } from 'svelte/store';
  import type { NavConfig } from '$lib/utils/types';

  export let backLabel: string = 'Back';
  export let forwardLabel: string = 'Next';
  export let showBack: boolean = false;
  export let showForward: boolean = false;
  export let onBack: () => void = () => {};
  export let onForward: () => void = () => {};

  const navConfig = getContext<Writable<NavConfig>>('navConfig');

  $: $navConfig = {backLabel, forwardLabel, showBack, showForward, onBack, onForward };

  onDestroy(() => $navConfig = { ...$navConfig, showBack: false, showForward: false });
</script>